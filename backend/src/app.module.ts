import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    BillingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
