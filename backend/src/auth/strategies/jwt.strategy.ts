import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

/** Extract JWT from httpOnly cookie first; fall back to Authorization Bearer header */
function cookieOrBearer(req: Request): string | null {
  if (req?.cookies?.access_token) return req.cookies.access_token;
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

interface UserAuthEntry {
  isActive: boolean;
  tokenVersion: number;
  checkedAt: number;
}

/** Short-lived shared auth-state cache; Redis makes revocation consistent across instances. */
const USER_AUTH_CACHE_TTL_SECONDS = 15;
const USER_AUTH_CACHE_TTL_MS = USER_AUTH_CACHE_TTL_SECONDS * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    super({
      jwtFromRequest: cookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');

    const now = Date.now();
    const cacheKey = 'auth:user:' + payload.sub;
    let authState = await this.cache.get<UserAuthEntry>(cacheKey);

    if (!authState || now - authState.checkedAt >= USER_AUTH_CACHE_TTL_MS) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true, tokenVersion: true },
      });
      authState = {
        isActive: user?.isActive ?? false,
        tokenVersion: user?.tokenVersion ?? 0,
        checkedAt: now,
      };
      await this.cache.set(cacheKey, authState, USER_AUTH_CACHE_TTL_SECONDS);
    }

    if (!authState.isActive) throw new UnauthorizedException('Account is deactivated');
    if ((payload.tokenVersion ?? 0) !== authState.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      username: payload.username,
      roleId: payload.roleId,
      role: payload.role,
      tenantId: payload.tenantId ?? 1,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      permissions: payload.permissions ?? {},
    };
  }
}
