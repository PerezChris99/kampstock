import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Overrides the default ThrottlerGuard to return a human-readable 429 message
 * instead of the generic "Too Many Requests".
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const forwarded = req.headers['x-forwarded-for'];
    const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
    return Promise.resolve(candidate || req.ip || 'unknown');
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: any,
  ): Promise<void> {
    throw new ThrottlerException(
      'Too many login attempts from this location. This limit resets automatically — please wait a few minutes and try again.',
    );
  }
}
