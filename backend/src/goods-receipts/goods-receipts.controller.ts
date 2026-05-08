import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGoodsReceiptDto, CreateSupplierInvoiceDto } from './dto/goods-receipt.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private grService: GoodsReceiptsService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Storekeeper')
  create(@Body() dto: CreateGoodsReceiptDto, @CurrentUser('id') actorId: number) {
    return this.grService.create(dto, actorId);
  }

  @Get()
  findAll() {
    return this.grService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.grService.findOne(id);
  }

  @Post('invoices')
  @Roles('Admin', 'Manager')
  createInvoice(@Body() dto: CreateSupplierInvoiceDto) {
    return this.grService.createInvoice(dto);
  }
}
