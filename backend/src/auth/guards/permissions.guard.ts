import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Permission-based guard.
 * Reads `@RequirePermissions(...)` metadata and verifies the JWT user
 * has every listed permission in their role's permissions object.
 *
 * Permission resolution order:
 *  1. isSuperAdmin  → always allowed
 *  2. permissions.all === true  → always allowed (Admin role)
 *  3. permissions[key] === true  → allowed for that specific key
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Insufficient permissions');

    // Super admins bypass all permission checks
    if (user.isSuperAdmin) return true;

    const perms: Record<string, boolean> = user.permissions ?? {};

    // If role has "all: true" (Admin), allow everything
    if (perms['all'] === true) return true;

    // Check every required permission
    const missing = required.filter((p) => perms[p] !== true);
    if (missing.length > 0) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
