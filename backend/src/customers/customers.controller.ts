import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Cashier')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.customersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Get(':id/ageing')
  getAgeing(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getAgeing(id);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
