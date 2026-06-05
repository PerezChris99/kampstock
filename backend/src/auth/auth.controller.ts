import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

const isDev = process.env.NODE_ENV !== 'production';
const CSRF_COOKIE = 'csrf_token';

/** Cookie TTLs in milliseconds */
const ACCESS_TOKEN_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setCookies(res: Response, accessToken: string, refreshToken: string) {
  // In production, the frontend and backend are on different origins (cross-origin AJAX).
  // sameSite:'none' + secure:true is required so the browser sends cookies cross-origin.
  const sameSite = isDev ? ('lax' as const) : ('none' as const);
  const base = { httpOnly: true, sameSite, secure: !isDev };
  res.cookie('access_token', accessToken, { ...base, maxAge: ACCESS_TOKEN_MS });
  res.cookie('refresh_token', refreshToken, {
    ...base,
    maxAge: REFRESH_TOKEN_MS,
    path: '/api/auth',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 300_000, limit: isDev ? 200 : 6 },
    long: { ttl: 3_600_000, limit: isDev ? 1000 : 20 },
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';
    const subdomainTenantId = (req as any).subdomainTenantId as
      | number
      | undefined;
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto,
      ip,
      subdomainTenantId,
    );
    setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 60_000, limit: isDev ? 200 : 10 },
    long: { ttl: 3_600_000, limit: isDev ? 1000 : 60 },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
      return;
    }
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refresh(refreshToken);
    setCookies(res, accessToken, newRefreshToken);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }

  /**
   * GET /auth/csrf
   * Returns the CSRF token that the frontend must attach as X-CSRF-Token header
   * on all state-changing requests. The middleware already set the csrf_token cookie;
   * this endpoint simply returns it so JS can read it.
   */
  @Public()
  @Get('csrf')
  @SkipThrottle()
  getCsrfToken(@Req() req: Request) {
    return { csrfToken: req.cookies?.[CSRF_COOKIE] ?? null };
  }
}
