import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resolves the current tenant from:
 *  1. `X-Tenant-Subdomain` header  (explicitly set by the frontend)
 *  2. `X-Forwarded-Host` header     (set by a reverse proxy like nginx/Cloudflare)
 *  3. `Host` header                 (direct subdomain hosting, e.g. acme.kampstock.com)
 *
 * Attaches to req:
 *   req.subdomainTenantId  � number | undefined
 *   req.subdomainTenant    � tenant object | undefined
 *
 * Results are cached for 60 seconds per subdomain to avoid a DB hit on every request.
 */

interface TenantInfo {
  id: number;
  name: string;
  subdomain: string;
  isActive: boolean;
  plan: string | null;
}

interface TenantCacheEntry {
  tenant: TenantInfo | null;
  cachedAt: number;
}

// Extend Express Request so subdomainTenantId / subdomainTenant are typed
declare module 'express' {
  interface Request {
    subdomainTenantId?: number;
    subdomainTenant?: TenantInfo;
  }
}

const tenantCache = new Map<string, TenantCacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/** Evict a specific subdomain from the cache (call when tenant data changes) */
export function bustTenantCache(subdomain: string): void {
  tenantCache.delete(subdomain);
}

@Injectable()
export class SubdomainTenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    let subdomain: string | null = null;

    // Build the skip set once — used for BOTH the explicit header and host heuristic.
    // When APP_DOMAIN is set this set is less relevant (only host-header path uses it),
    // but we always apply it to the explicit header so the frontend can never send
    // a known app-root hostname (e.g. "kampstock-avmu") as a tenant subdomain.
    const appDomain = (process.env.APP_DOMAIN ?? '').toLowerCase().trim();
    const SKIP = new Set([
      'www',
      'api',
      'mail',
      'localhost',
      'kampstock',
      'kampstock-avmu',
      'kampstock-pzmh',
    ]);
    (process.env.APP_HOST_SKIP ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
      .forEach((h) => SKIP.add(h));

    // 1. Explicit header from frontend (preferred, works in all environments).
    //    Validated against the SKIP set so the frontend can never accidentally send
    //    an app-root hostname (e.g. "kampstock-avmu") as a tenant subdomain.
    const explicitHeader = req.headers['x-tenant-subdomain'] as
      | string
      | undefined;
    if (explicitHeader) {
      const cleaned = explicitHeader.toLowerCase().trim();
      // Validate format: only lowercase alphanumeric and hyphens, 1-63 chars
      if (/^[a-z0-9][a-z0-9-]{0,62}$/.test(cleaned) && !SKIP.has(cleaned)) {
        subdomain = cleaned;
      }
    }

    // 2. Extract from reverse-proxy or host header.
    // APP_DOMAIN is the authoritative approach: only "sub.APP_DOMAIN" is a tenant.
    // Without APP_DOMAIN we use the heuristic with the same SKIP set.
    if (!subdomain) {
      const host =
        (req.headers['x-forwarded-host'] as string | undefined)
          ?.split(',')[0]
          ?.trim() ??
        req.headers.host ??
        '';
      const hostname = host.split(':')[0].toLowerCase();

      if (appDomain) {
        const suffix = `.${appDomain}`;
        if (hostname !== appDomain && hostname.endsWith(suffix)) {
          const sub = hostname.slice(0, hostname.length - suffix.length);
          const RESERVED = new Set(['www', 'api', 'mail', 'app', 'admin']);
          if (sub && !sub.includes('.') && !RESERVED.has(sub)) {
            subdomain = sub;
          }
        }
      } else {
        const parts = hostname.split('.');
        if (parts.length >= 3 && !SKIP.has(parts[0])) {
          subdomain = parts[0];
        }
      }
    }

    if (subdomain) {
      const cached = tenantCache.get(subdomain);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        if (cached.tenant) {
          req.subdomainTenantId = cached.tenant.id;
          req.subdomainTenant = cached.tenant;
        }
        return next();
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
        select: {
          id: true,
          name: true,
          subdomain: true,
          isActive: true,
          plan: true,
        },
      });

      tenantCache.set(subdomain, {
        tenant: tenant?.isActive ? tenant : null,
        cachedAt: Date.now(),
      });

      if (tenant?.isActive) {
        req.subdomainTenantId = tenant.id;
        req.subdomainTenant = tenant;
      }
    }

    next();
  }
}
