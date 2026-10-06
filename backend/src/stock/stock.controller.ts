import { Controller, Get, Post, Body, Query, ParseIntPipe, Param } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockLocationDto, StockAdjustmentDto, StockTransferDto } from './dto/stock.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('stock')
export class StockController {
  constructor(private stockService: StockService) {}

  @Post('locations')
  @Roles('Admin', 'Manager')
  createLocation(@Body() dto: CreateStockLocationDto, @CurrentUser('tenantId') tenantId: number) {
    return this.stockService.createLocation(dto, tenantId);
  }

  @Get('locations')
  findLocations(@CurrentUser('tenantId') tenantId?: number) {
    return this.stockService.findAllLocations(tenantId);
  }

  @Get('items')
  findItems(@Query('locationId') locationId?: string, @Query('productId') productId?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.stockService.findStockItems(
      locationId ? parseInt(locationId) : undefined,
      productId ? parseInt(productId) : undefined,
      tenantId,
    );
  }

  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.stockService.getLowStockItems(threshold ? parseInt(threshold) : 10, tenantId);
  }

  @Get('expiring')
  getExpiring(@Query('days') days?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.stockService.getExpiringItems(days ? parseInt(days) : 30, tenantId);
  }

  @Get('movements')
  findMovements(@Query('productId') productId?: string, @Query('locationId') locationId?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.stockService.findMovements(
      productId ? parseInt(productId) : undefined,
      locationId ? parseInt(locationId) : undefined,
      tenantId,
    );
  }

  @Post('adjust')
  @Roles('Admin', 'Manager', 'Storekeeper')
  adjust(@Body() dto: StockAdjustmentDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.stockService.adjust(dto, actorId, tenantId);
  }

  @Post('transfer')
  @Roles('Admin', 'Manager', 'Storekeeper')
  transfer(@Body() dto: StockTransferDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.stockService.transfer(dto, actorId, tenantId);
  }
}
