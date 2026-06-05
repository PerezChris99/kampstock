import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/auth.dto';

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  /** Per-username brute-force tracking (in-memory, suitable for single-instance) */
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly MAX_ATTEMPTS =
    process.env.NODE_ENV === 'production' ? 20 : 100; // 20 attempts before lockout
  private readonly LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

  private checkLock(key: string): void {
    const rec = this.attempts.get(key);
    if (rec?.lockedUntil && Date.now() < rec.lockedUntil) {
      const secsLeft = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
      const minsLeft = Math.ceil(secsLeft / 60);
      const unlockAt = new Date(rec.lockedUntil).toLocaleTimeString('en-UG', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new UnauthorizedException(
        `Login temporarily limited due to too many failed attempts. ` +
          `Please try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'} (resets at approximately ${unlockAt}).`,
      );
    }
    // Clear expired lock automatically
    if (rec?.lockedUntil && Date.now() >= rec.lockedUntil) {
      this.attempts.delete(key);
    }
  }

  private recordFail(key: string, username?: string, ip?: string): void {
    const rec = this.attempts.get(key) ?? { count: 0 };
    rec.count += 1;
    if (rec.count >= this.MAX_ATTEMPTS) {
      rec.lockedUntil = Date.now() + this.LOCKOUT_MS;
      // Persist the lockout to DB so admins can see and manage it
      if (username && ip && key.startsWith('user:')) {
        this.persistLock(username, ip, rec.count);
      }
    }
    this.attempts.set(key, rec);
  }

  private clearAttempts(key: string, username?: string): void {
    const rec = this.attempts.get(key);
    if (rec?.lockedUntil && username) {
      // Mark the DB lock as resolved when user logs in successfully
      this.prisma.accountLock
        .updateMany({
          where: { username, isActive: true },
          data: { isActive: false, unlockedAt: new Date() },
        })
        .catch(() => {});
    }
    this.attempts.delete(key);
  }

  /** Persist a brute-force lockout to the database so admins can view/manage it */
  private persistLock(username: string, ip: string, failCount: number): void {
    const lockedUntil = new Date(Date.now() + this.LOCKOUT_MS);
    this.prisma.user
      .findFirst({ where: { username } }) // findFirst: username no longer globally unique
      .then((user) =>
        this.prisma.accountLock.create({
          data: {
            username,
            userId: user?.id ?? null,
            reason: 'BRUTE_FORCE',
            triggerSource: 'SYSTEM',
            ipAddress: ip,
            failCount,
            lockedUntil,
            metadata: JSON.stringify({
              ip,
              triggeredAt: new Date().toISOString(),
            }),
          },
        }),
      )
      .catch(() => {});
  }

  async login(dto: LoginDto, ip = 'unknown', subdomainTenantId?: number) {
    // Check lockout by both username and IP
    this.checkLock(`user:${dto.username}`);
    this.checkLock(`ip:${ip}`);

    const user = await this.prisma.user.findUnique({
      where: {
        username_tenantId: {
          username: dto.username,
          tenantId: subdomainTenantId ?? 1,
        },
      },
      include: { role: true },
    });

    // Always run bcrypt compare to prevent timing attacks, even if user not found
    const dummyHash =
      '$2a$12$invaliddummyhashforsecuritypurposesonly00000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : (await bcrypt.compare(dto.password, dummyHash), false);

    if (!user || !user.isActive || !passwordMatch) {
      this.recordFail(`user:${dto.username}`, dto.username, ip);
      this.recordFail(`ip:${ip}`);
      // Log failed attempt (fire-and-forget — never blocks login)
      this.audit
        .log(
          null,
          'LOGIN_FAIL',
          'User',
          null,
          null,
          { username: dto.username, ip },
          ip,
        )
        .catch(() => {});
      // Identical message regardless of whether user exists (prevents user enumeration)
      throw new UnauthorizedException('Invalid credentials');
    }

    // If the request came in on a tenant subdomain, ensure the user belongs to that tenant
    if (subdomainTenantId && user.tenantId !== subdomainTenantId) {
      this.recordFail(`user:${dto.username}`, dto.username, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.clearAttempts(`user:${dto.username}`, dto.username);
    this.clearAttempts(`ip:${ip}`);

    // Record last login + audit (fire-and-forget — don't block the response)
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});
    this.audit
      .log(
        user.id,
        'LOGIN_SUCCESS',
        'User',
        user.id,
        null,
        { ip },
        ip,
        user.tenantId,
      )
      .catch(() => {});

    const tokens = this.generateTokens(user);

    // If admin has flagged this account for forced password reset, signal it in response
    // The frontend should redirect to a change-password page and block normal navigation.
    if (user.forcePasswordReset) {
      return { ...tokens, requirePasswordReset: true };
    }

    return tokens;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });
      if (!user || !user.isActive) throw new UnauthorizedException();
      // Reject if the token's version doesn't match the stored version
      // (handles revocation via logout or admin suspension)
      if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        throw new UnauthorizedException('Token has been revoked');
      }
      // Rotate: increment tokenVersion so previous refresh tokens are invalidated
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
        include: { role: true },
      });
      return this.generateTokens(updated);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: any) {
    // Normalize role name — strip legacy `_<tenantId>` suffix if present
    const rawRoleName: string = user.role?.name ?? '';
    const normalizedRole = rawRoleName.replace(/_\d+$/, '');

    // Parse permissions JSON from the role record
    let permissions: Record<string, boolean> = {};
    try {
      permissions = JSON.parse(user.role?.permissions ?? '{}');
    } catch {
      permissions = {};
    }

    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      role: normalizedRole,
      tenantId: user.tenantId ?? 1,
      isSuperAdmin: user.isSuperAdmin ?? false,
      permissions,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as any,
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: normalizedRole,
        tenantId: user.tenantId ?? 1,
        isSuperAdmin: user.isSuperAdmin ?? false,
        permissions,
      },
    };
  }
}
