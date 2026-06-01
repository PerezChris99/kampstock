import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Allows only users whose JWT contains isSuperAdmin: true.
 * Must be used AFTER the JwtAuthGuard has already verified the token.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException('Super-admin access required');
    }
    return true;
  }
}
