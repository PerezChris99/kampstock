import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily-sales')
  @Roles('Admin', 'Manager')
  dailySales(@Query('date') date: string) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.reportsService.dailySalesSummary(d);
  }

  @Get('stock-valuation')
  @Roles('Admin', 'Manager')
  stockValuation() {
    return this.reportsService.stockValuation();
  }

  @Get('slow-movers')
  @Roles('Admin', 'Manager')
  slowMovers(@Query('days') days?: string) {
    return this.reportsService.slowMovingItems(days ? parseInt(days) : 30);
  }

  @Get('monthly-profit')
  @Roles('Admin', 'Manager')
  monthlyProfit(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.reportsService.monthlyProfitSummary(
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }
}
