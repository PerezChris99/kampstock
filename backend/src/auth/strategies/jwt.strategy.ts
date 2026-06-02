import { Injectable } from '@nestjs/common';
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
    super({
      jwtFromRequest: cookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'fallback-secret',
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, username: payload.username, roleId: payload.roleId, role: payload.role, tenantId: payload.tenantId ?? 1 };
  }
}
