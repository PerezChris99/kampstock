import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac } from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_SECRET =
  process.env.CSRF_SECRET || 'csrf-default-secret-change-in-prod';

/** Methods that mutate state and require CSRF verification */
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Routes excluded from CSRF (webhooks, public auth endpoints handled separately) */
const CSRF_BYPASS_PREFIXES = [
  '/api/billing/ipn', // Pesapal webhook — arrives server-to-server
  '/api/auth/login', // Login sets the cookie — token not yet available
  '/api/auth/refresh', // Refresh uses httpOnly cookie only
  '/api/tenants/register', // Public registration
];

function sign(token: string): string {
  return createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
}

function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function verifyCsrfToken(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  // Constant-time comparison via re-signing
  const expectedSig = sign(expected);
  const providedSig = sign(token);
  return expectedSig === providedSig && token === expected;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path ?? '';
    const method = (req.method ?? '').toUpperCase();

    // Always issue/refresh the CSRF cookie on every response
    let csrfToken: string = req.cookies?.[CSRF_COOKIE];
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
      // sameSite:'none' needed in production so frontend on a different origin can receive
      // and send the cookie. Must be paired with secure:true.
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie(CSRF_COOKIE, csrfToken, {
        httpOnly: false, // Must be readable by JS to attach to header
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    // Only validate for unsafe methods
    if (!UNSAFE_METHODS.has(method)) return next();

    // Check bypass list
    const isBypassed = CSRF_BYPASS_PREFIXES.some((prefix) =>
      path.startsWith(prefix.replace('/api', '')),
    );
    if (isBypassed) return next();

    // Validate double-submit: header token must match cookie token
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;
    if (!headerToken || !verifyCsrfToken(headerToken, csrfToken)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }
}
