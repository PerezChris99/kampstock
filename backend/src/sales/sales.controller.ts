import { Controller, Get, Post, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto, AddPaymentDto } from './dto/sale.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Cashier')
  create(@Body() dto: CreateSaleDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.salesService.create(dto, actorId, tenantId, role);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.salesService.findAll(date, cashierId ? parseInt(cashierId) : undefined, tenantId, limit, offset, from, to);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.salesService.findOne(id, tenantId);
  }

  @Post(':id/payments')
  @Roles('Admin', 'Manager', 'Cashier')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPaymentDto,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    return this.salesService.addPayment(id, dto, actorId, tenantId);
  }

  @Post(':id/return')
  @Roles('Admin', 'Manager')
  returnSale(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.salesService.returnSale(id, actorId, tenantId);
  }
}
