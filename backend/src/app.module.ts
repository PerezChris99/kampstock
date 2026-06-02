import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { PrismaModule } from './prisma/prisma.module';
import { SubdomainTenantMiddleware } from './common/middleware/subdomain-tenant.middleware';
import { TenantLockMiddleware } from './common/middleware/tenant-lock.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { envValidationSchema } from './config/env.validation';
import { winstonLogger } from './config/logger';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { BackupModule } from './backup/backup.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    WinstonModule.forRoot({ instance: winstonLogger }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000,   limit: 60 },   // 60 req/min  per IP  (general)
      { name: 'long',  ttl: 3_600_000, limit: 600 },  // 600 req/hr  per IP  (general)
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    StockModule,
    SuppliersModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    CustomersModule,
    SalesModule,
    ExpensesModule,
    ReportsModule,
    AuditModule,
    HealthModule,
    BackupModule,
    TenantsModule,
    CacheModule,
    BillingModule,
    SuperAdminModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SubdomainTenantMiddleware).forRoutes('*');
    consumer.apply(TenantLockMiddleware).forRoutes('*');
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
