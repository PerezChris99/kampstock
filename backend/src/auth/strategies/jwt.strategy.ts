import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/** Extract JWT from httpOnly cookie first; fall back to Authorization Bearer header */
function cookieOrBearer(req: Request): string | null {
  if (req?.cookies?.access_token) return req.cookies.access_token;
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

interface UserStatusEntry {
  isActive: boolean;
  checkedAt: number;
}

/** 60-second TTL in-memory cache — avoids a DB lookup on every request */
const USER_STATUS_CACHE = new Map<number, UserStatusEntry>();
const USER_STATUS_TTL_MS = 60_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
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
    const cached = USER_STATUS_CACHE.get(payload.sub);
    let isActive: boolean;

    if (cached && now - cached.checkedAt < USER_STATUS_TTL_MS) {
      isActive = cached.isActive;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true },
      });
      isActive = user?.isActive ?? false;
      USER_STATUS_CACHE.set(payload.sub, { isActive, checkedAt: now });
    }

    if (!isActive) throw new UnauthorizedException('Account is deactivated');

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
