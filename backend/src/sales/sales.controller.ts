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
  create(@Body() dto: CreateSaleDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.salesService.create(dto, actorId, tenantId);
  }

  @Get()
  findAll(@Query('date') date?: string, @Query('cashierId') cashierId?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.salesService.findAll(date, cashierId ? parseInt(cashierId) : undefined, tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Post(':id/payments')
  @Roles('Admin', 'Manager', 'Cashier')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPaymentDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.salesService.addPayment(id, dto, actorId);
  }

  @Post(':id/return')
  @Roles('Admin', 'Manager')
  returnSale(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
    return this.salesService.returnSale(id, actorId);
  }
}
