import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * TenantRequiredMiddleware — runs after SubdomainTenantMiddleware.
 *
 * Rejects state-changing requests (POST, PUT, PATCH, DELETE) that arrive
 * without a resolved tenantId. Without this guard, a missing/invalid
 * X-Tenant-Subdomain header would silently fall through and either:
 *   a) use tenantId from JWT (which is fine — JWT-authenticated requests are OK)
 *   b) default to tenantId=1 via schema default — silently polluting tenant 1's data
 *
 * This middleware only blocks requests that have NO tenantId at all
 * (no subdomain resolved AND no JWT user attached yet). JWT-authenticated
 * requests are not blocked here because the JWT guard runs later and will
 * correctly set tenantId from the token payload.
 *
 * Bypassed for:
 *   - All GET/HEAD/OPTIONS requests (read-only, safe)
 *   - Auth routes (login, register, CSRF — no tenant needed)
 *   - Billing callbacks and tenant registration
 *   - Health check
 */

const BYPASS_PREFIXES = [
  '/api/auth/',
  '/api/billing/ipn',
  '/api/billing/callback',
  '/api/tenants/register',
  '/api/tenants/subdomain',
  '/api/health',
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class TenantRequiredMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip safe HTTP methods
    if (SAFE_METHODS.has(req.method)) return next();

    // Skip bypass routes
    const path = req.path;
    if (BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix))) return next();

    // If neither subdomain middleware nor JWT has resolved a tenantId yet,
    // and the request has no Authorization header (i.e. JWT guard hasn't run),
    // we can't know the tenant. But we should NOT block here if the request
    // is JWT-authenticated — the JWT guard will run later and set tenantId.
    //
    // Only block unauthenticated mutation requests with no subdomain resolution.
    const hasSubdomainTenant = !!(req as any).subdomainTenantId;
    const hasAuthHeader = !!(req.headers.authorization || req.cookies?.access_token);

    if (!hasSubdomainTenant && !hasAuthHeader) {
      res.status(400).json({
        statusCode: 400,
        message: 'Tenant context could not be resolved. Ensure X-Tenant-Subdomain header is set.',
      });
      return;
    }

    next();
  }
}
