import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @Roles('Admin', 'Manager')
  create(@Body() dto: CreateSupplierDto, @CurrentUser('tenantId') tenantId: number) {
    return this.suppliersService.create(dto, tenantId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.suppliersService.findAll(search, tenantId, limit, offset);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.suppliersService.findOne(id, tenantId);
  }

  @Get(':id/balance')
  getBalance(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.getBalance(id);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto, @CurrentUser('tenantId') tenantId: number) {
    return this.suppliersService.update(id, dto, tenantId);
  }
}
