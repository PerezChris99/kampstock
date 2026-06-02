import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/** Extract JWT from httpOnly cookie first; fall back to Authorization Bearer header */
function cookieOrBearer(req: Request): string | null {
  if (req?.cookies?.access_token) return req.cookies.access_token;
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
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
