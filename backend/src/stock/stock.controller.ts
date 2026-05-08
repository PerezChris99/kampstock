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
  createLocation(@Body() dto: CreateStockLocationDto) {
    return this.stockService.createLocation(dto);
  }

  @Get('locations')
  findLocations() {
    return this.stockService.findAllLocations();
  }

  @Get('items')
  findItems(@Query('locationId') locationId?: string, @Query('productId') productId?: string) {
    return this.stockService.findStockItems(
      locationId ? parseInt(locationId) : undefined,
      productId ? parseInt(productId) : undefined,
    );
  }

  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.stockService.getLowStockItems(threshold ? parseInt(threshold) : 10);
  }

  @Get('expiring')
  getExpiring(@Query('days') days?: string) {
    return this.stockService.getExpiringItems(days ? parseInt(days) : 30);
  }

  @Get('movements')
  findMovements(@Query('productId') productId?: string, @Query('locationId') locationId?: string) {
    return this.stockService.findMovements(
      productId ? parseInt(productId) : undefined,
      locationId ? parseInt(locationId) : undefined,
    );
  }

  @Post('adjust')
  @Roles('Admin', 'Manager', 'Storekeeper')
  adjust(@Body() dto: StockAdjustmentDto, @CurrentUser('id') actorId: number) {
    return this.stockService.adjust(dto, actorId);
  }

  @Post('transfer')
  @Roles('Admin', 'Manager', 'Storekeeper')
  transfer(@Body() dto: StockTransferDto, @CurrentUser('id') actorId: number) {
    return this.stockService.transfer(dto, actorId);
  }
}
