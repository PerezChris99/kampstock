import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Cashier')
  create(@Body() dto: CreateCustomerDto, @CurrentUser('tenantId') tenantId: number) {
    return this.customersService.create(dto, tenantId);
  }

  @Get()
  findAll(@Query('search') search?: string, @CurrentUser('tenantId') tenantId?: number) {
    return this.customersService.findAll(search, tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.customersService.findOne(id, tenantId);
  }

  @Get(':id/ageing')
  getAgeing(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.customersService.getAgeing(id, tenantId);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto, @CurrentUser('tenantId') tenantId: number) {
    return this.customersService.update(id, dto, tenantId);
  }
}
