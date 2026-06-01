import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @ReqTenant() — Extracts the tenant object resolved by SubdomainTenantMiddleware.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@ReqTenant() tenant: { id: number; name: string; subdomain: string } | null) { ... }
 */
export const ReqTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return (req as any).subdomainTenant ?? null;
  },
);
