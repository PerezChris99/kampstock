import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantLockMiddleware — runs after SubdomainTenantMiddleware.
 *
 * Blocks any tenant whose subscription has expired with HTTP 402.
 * Logic:
 *  1. If the tenant has an active `trialEndsAt` in the future → allowed.
 *  2. If `planExpiresAt` is set and in the future → allowed.
 *  3. If neither condition is met AND the tenant has at least one subscription
 *     (i.e. they are past the grace/trial window) → 402.
 *
 * Skipped for:
 *  - Super-admins (JWT payload isSuperAdmin=true)
 *  - Public billing/auth/health/tenant discovery routes
 *  - Requests without a resolvable tenantId
 */

// Routes that are always allowed even when locked
const BYPASS_PREFIXES = [
  '/api/auth/',
  '/api/billing/ipn',
  '/api/billing/unlock',
  '/api/billing/subscribe',
  '/api/billing/my',
  '/api/tenants/subdomain',
  '/api/health',
  '/api/tenants/register',
];

// Cache lock checks for 60 seconds to avoid repeated DB queries per tenant
const lockCache = new Map<number, { locked: boolean; expiresAt: Date | null; checkedAt: number }>();
const CACHE_TTL_MS = 60_000;

@Injectable()
export class TenantLockMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.path;

    // Skip bypass routes
    if (BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    // Determine tenantId: from JWT user (already decoded by JwtStrategy) or subdomain middleware
    const tenantId: number | undefined =
      (req as any).user?.tenantId ?? (req as any).subdomainTenantId;

    if (!tenantId) return next(); // unauthenticated / no tenant context

    // Super-admins are never locked
    if ((req as any).user?.isSuperAdmin) return next();

    const now = Date.now();
    const cached = lockCache.get(tenantId);
    if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
      if (cached.locked) {
        throw new HttpException(
          { locked: true, expiresAt: cached.expiresAt },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      return next();
    }

    // Fetch tenant lock status from DB
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { planExpiresAt: true, trialEndsAt: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new HttpException({ locked: true, expiresAt: null }, HttpStatus.PAYMENT_REQUIRED);
    }

    const nowDate = new Date();
    let locked = false;

    // Trial still active
    if (tenant.trialEndsAt && tenant.trialEndsAt > nowDate) {
      locked = false;
    } else if (tenant.planExpiresAt) {
      // Plan expiry set — check if expired
      locked = tenant.planExpiresAt < nowDate;
    }
    // If neither trialEndsAt nor planExpiresAt is set the tenant is on a perpetual/manual plan → not locked

    lockCache.set(tenantId, {
      locked,
      expiresAt: tenant.planExpiresAt,
      checkedAt: now,
    });

    if (locked) {
      throw new HttpException(
        { locked: true, expiresAt: tenant.planExpiresAt },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    next();
  }
}

/** Call this after a successful unlock to bust the cache for a tenant */
export function bustLockCache(tenantId: number): void {
  lockCache.delete(tenantId);
}
