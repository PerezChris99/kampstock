import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Strip the legacy `_<tenantId>` suffix from role names so that
 * existing tenants with roles like `Admin_1` still pass `@Roles('Admin')`.
 * New tenants created after the RBAC fix will have clean names already.
 */
const normalizeRole = (role: string): string => role.replace(/_\d+$/, '');

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Insufficient permissions');

    // Super admins bypass role checks
    if (user.isSuperAdmin) return true;

    const userRole = normalizeRole(user.role ?? '');
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
