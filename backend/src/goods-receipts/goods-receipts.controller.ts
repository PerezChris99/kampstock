import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import {
  CreateGoodsReceiptDto,
  CreateSupplierInvoiceDto,
} from './dto/goods-receipt.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private grService: GoodsReceiptsService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Storekeeper')
  create(
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    return this.grService.create(dto, actorId, tenantId);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId?: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.grService.findAll(
      tenantId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.grService.findOne(id, tenantId);
  }

  @Post('invoices')
  @Roles('Admin', 'Manager')
  createInvoice(@Body() dto: CreateSupplierInvoiceDto, @CurrentUser('tenantId') tenantId: number) {
    return this.grService.createInvoice(dto, tenantId);
  }
}
