import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

const isDev = process.env.NODE_ENV !== 'production';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Login — tightly rate-limited in production.
   * 6 attempts per 5 minutes per IP; 20 per hour.
   * Additionally, AuthService tracks per-username attempts and locks accounts.
   * In development the throttle is relaxed to 200 per minute.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 300_000, limit: isDev ? 200 : 6 },
    long:  { ttl: 3_600_000, limit: isDev ? 1000 : 20 },
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? 'unknown';
    return this.authService.login(dto, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 60_000, limit: isDev ? 200 : 10 },
    long:  { ttl: 3_600_000, limit: isDev ? 1000 : 60 },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
