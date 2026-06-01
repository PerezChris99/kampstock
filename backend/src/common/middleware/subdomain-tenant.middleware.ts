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
 */
@Injectable()
export class SubdomainTenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    let subdomain: string | null = null;

    // 1. Explicit header from frontend (preferred, works in all environments)
    const explicitHeader = req.headers['x-tenant-subdomain'] as string | undefined;
    if (explicitHeader) {
      const cleaned = explicitHeader.toLowerCase().trim();
      // Validate format: only lowercase alphanumeric and hyphens, 1-63 chars
      if (/^[a-z0-9][a-z0-9-]{0,62}$/.test(cleaned)) {
        subdomain = cleaned;
      }
    }

    // 2. Extract from reverse-proxy or host header
    if (!subdomain) {
      const host =
        (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
        req.headers.host ||
        '';
      const hostname = host.split(':')[0].toLowerCase(); // strip port
      const parts = hostname.split('.');
      // Needs at least 3 parts (sub.domain.tld), skip 'www', 'api', 'mail' etc.
      const SKIP = new Set(['www', 'api', 'mail', 'localhost', 'kampstock']);
      if (parts.length >= 3 && !SKIP.has(parts[0])) {
        subdomain = parts[0];
      }
    }

    if (subdomain) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
        select: { id: true, name: true, subdomain: true, isActive: true, plan: true },
      });
      if (tenant && tenant.isActive) {
        (req as any).subdomainTenantId = tenant.id;
        (req as any).subdomainTenant = tenant;
      }
    }

    next();
  }
}
