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
 *   req.subdomainTenantId  — number | undefined
 *   req.subdomainTenant    — tenant object | undefined
 *
 * Results are cached for 60 seconds per subdomain to avoid a DB hit on every request.
 */

interface TenantCacheEntry {
  tenant: {
    id: number;
    name: string;
    subdomain: string;
    isActive: boolean;
    plan: string | null;
  } | null;
  cachedAt: number;
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

    // 1. Explicit header from frontend (preferred, works in all environments)
    const explicitHeader = req.headers['x-tenant-subdomain'] as
      | string
      | undefined;
    if (explicitHeader) {
      const cleaned = explicitHeader.toLowerCase().trim();
      // Validate format: only lowercase alphanumeric and hyphens, 1-63 chars
      if (/^[a-z0-9][a-z0-9-]{0,62}$/.test(cleaned)) {
        subdomain = cleaned;
      }
    }

    // 2. Extract from reverse-proxy or host header using the configured root domain.
    // APP_DOMAIN is the authoritative way: only "sub.APP_DOMAIN" is a tenant hostname.
    // Without APP_DOMAIN we fall back to the old heuristic but with a strict SKIP list
    // so Vercel project hostnames (e.g. kampstock-pzmh.vercel.app) are never matched.
    if (!subdomain) {
      const host =
        (req.headers['x-forwarded-host'] as string | undefined)
          ?.split(',')[0]
          ?.trim() ||
        req.headers.host ||
        '';
      const hostname = host.split(':')[0].toLowerCase(); // strip port

      const appDomain = (process.env.APP_DOMAIN || '').toLowerCase().trim();

      if (appDomain) {
        // Env-var driven: only "<sub>.<appDomain>" is a tenant hostname
        const suffix = `.${appDomain}`;
        if (hostname !== appDomain && hostname.endsWith(suffix)) {
          const sub = hostname.slice(0, hostname.length - suffix.length);
          const RESERVED = new Set(['www', 'api', 'mail', 'app', 'admin']);
          if (sub && !sub.includes('.') && !RESERVED.has(sub)) {
            subdomain = sub;
          }
        }
      } else {
        // Fallback heuristic — only used when APP_DOMAIN is not configured.
        // Requires 3+ hostname parts AND the first part must not be a known
        // non-tenant label (including the Vercel project hostname prefixes).
        const parts = hostname.split('.');
        const SKIP = new Set([
          'www', 'api', 'mail', 'localhost', 'kampstock',
          'kampstock-avmu',   // production frontend Vercel project
          'kampstock-pzmh',   // production backend Vercel project
        ]);
        // Accept additional skip entries from APP_HOST_SKIP env var
        const extra = (process.env.APP_HOST_SKIP || '')
          .split(',').map((h) => h.trim()).filter(Boolean);
        extra.forEach((h) => SKIP.add(h));
        if (parts.length >= 3 && !SKIP.has(parts[0])) {
          subdomain = parts[0];
        }
      }
    }

    if (subdomain) {
      // Check cache first
      const cached = tenantCache.get(subdomain);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        if (cached.tenant) {
          (req as any).subdomainTenantId = cached.tenant.id;
          (req as any).subdomainTenant = cached.tenant;
        }
        return next();
      }

      // Cache miss — query DB
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

      // Cache the result (even null — to avoid hammering DB for unknown subdomains)
      tenantCache.set(subdomain, {
        tenant: tenant?.isActive ? tenant : null,
        cachedAt: Date.now(),
      });

      if (tenant && tenant.isActive) {
        (req as any).subdomainTenantId = tenant.id;
        (req as any).subdomainTenant = tenant;
      }
    }

    next();
  }
}
