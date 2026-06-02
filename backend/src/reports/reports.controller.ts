import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily-sales')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  dailySales(@Query('date') date: string, @CurrentUser('tenantId') tenantId?: number) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.reportsService.dailySalesSummary(d, tenantId);
  }

  @Get('stock-valuation')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  stockValuation(@CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.stockValuation(tenantId);
  }

  @Get('slow-movers')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  slowMovers(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.slowMovingItems(days ? parseInt(days) : 30, tenantId);
  }

  @Get('monthly-profit')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  monthlyProfit(@Query('year') year: string, @Query('month') month: string, @CurrentUser('tenantId') tenantId?: number) {
    const now = new Date();
    return this.reportsService.monthlyProfitSummary(
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
      tenantId,
    );
  }

  @Get('sales-trend')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  salesTrend(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.salesTrend(days ? parseInt(days) : 30, tenantId);
  }

  @Get('top-products')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  topProducts(@Query('limit') limit?: string, @Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.topProducts(limit ? parseInt(limit) : 10, days ? parseInt(days) : 30, tenantId);
  }

  @Get('payment-breakdown')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  paymentBreakdown(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.paymentBreakdown(days ? parseInt(days) : 30, tenantId);
  }

  @Get('category-sales')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  categorySales(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.categorySales(days ? parseInt(days) : 30, tenantId);
  }

  @Get('monthly-summary')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  monthlySummary(@Query('months') months?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.monthlySummary(months ? parseInt(months) : 6, tenantId);
  }

  @Get('kpi-overview')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  kpiOverview(@CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.kpiOverview(tenantId);
  }

  @Get('expiring-items')
  @Roles('Admin', 'Manager', 'Storekeeper')
  expiringItems(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.reportsService.expiringItems(days ? parseInt(days) : 30, tenantId);
  }
}
