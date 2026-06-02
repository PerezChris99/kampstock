import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require one or more fine-grained permissions on a route.
 *
 * @example
 *   @RequirePermissions('manage_products', 'view_reports')
 *
 * Built-in permission keys (mirrors the Role.permissions JSON schema):
 *   all | manage_products | manage_sales | create_sales |
 *   view_reports | manage_stock | manage_users | manage_expenses |
 *   manage_suppliers | manage_purchase_orders | manage_customers |
 *   manage_backup | manage_billing | super_admin
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
