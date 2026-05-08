import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily-sales')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  dailySales(@Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.reportsService.dailySalesSummary(d);
  }

  @Get('stock-valuation')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  stockValuation() {
    return this.reportsService.stockValuation();
  }

  @Get('slow-movers')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  slowMovers(@Query('days') days?: string) {
    return this.reportsService.slowMovingItems(days ? parseInt(days) : 30);
  }

  @Get('monthly-profit')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  monthlyProfit(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.reportsService.monthlyProfitSummary(
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }

  @Get('sales-trend')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  salesTrend(@Query('days') days?: string) {
    return this.reportsService.salesTrend(days ? parseInt(days) : 30);
  }

  @Get('top-products')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  topProducts(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.reportsService.topProducts(limit ? parseInt(limit) : 10, days ? parseInt(days) : 30);
  }

  @Get('payment-breakdown')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  paymentBreakdown(@Query('days') days?: string) {
    return this.reportsService.paymentBreakdown(days ? parseInt(days) : 30);
  }

  @Get('category-sales')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  categorySales(@Query('days') days?: string) {
    return this.reportsService.categorySales(days ? parseInt(days) : 30);
  }

  @Get('monthly-summary')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  monthlySummary(@Query('months') months?: string) {
    return this.reportsService.monthlySummary(months ? parseInt(months) : 6);
  }

  @Get('kpi-overview')
  @Roles('Admin', 'Manager', 'Cashier', 'Storekeeper')
  kpiOverview() {
    return this.reportsService.kpiOverview();
  }
}
