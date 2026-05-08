import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

  /** Per-username brute-force tracking (in-memory, suitable for single-instance) */
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  private checkLock(key: string): void {
    const rec = this.attempts.get(key);
    if (rec?.lockedUntil && Date.now() < rec.lockedUntil) {
      const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60_000);
      throw new UnauthorizedException(
        `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
      );
    }
  }

  private recordFail(key: string): void {
    const rec = this.attempts.get(key) ?? { count: 0 };
    rec.count += 1;
    if (rec.count >= this.MAX_ATTEMPTS) {
      rec.lockedUntil = Date.now() + this.LOCKOUT_MS;
    }
    this.attempts.set(key, rec);
  }

  private clearAttempts(key: string): void {
    this.attempts.delete(key);
  }

  async login(dto: LoginDto, ip = 'unknown') {
    // Check lockout by both username and IP
    this.checkLock(`user:${dto.username}`);
    this.checkLock(`ip:${ip}`);

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { role: true },
    });

    // Always run bcrypt compare to prevent timing attacks, even if user not found
    const dummyHash = '$2a$12$invaliddummyhashforsecuritypurposesonly00000000000000000';
    const passwordMatch = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : (await bcrypt.compare(dto.password, dummyHash), false);

    if (!user || !user.isActive || !passwordMatch) {
      this.recordFail(`user:${dto.username}`);
      this.recordFail(`ip:${ip}`);
      // Identical message regardless of whether user exists (prevents user enumeration)
      throw new UnauthorizedException('Invalid credentials');
    }

    this.clearAttempts(`user:${dto.username}`);
    this.clearAttempts(`ip:${ip}`);
    return this.generateTokens(user);
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
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      role: user.role.name,
      tenantId: user.tenantId ?? 1,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role.name,
        tenantId: user.tenantId ?? 1,
      },
    };
  }
}
