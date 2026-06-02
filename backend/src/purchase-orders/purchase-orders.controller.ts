import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePOStatusDto,
} from './dto/purchase-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private poService: PurchaseOrdersService) {}

  @Post()
  @Roles('Admin', 'Manager')
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    return this.poService.create(dto, actorId, tenantId);
  }

  @Get()
  findAll(
    @Query('supplierId') supplierId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.poService.findAll(
      supplierId ? parseInt(supplierId) : undefined,
      tenantId,
      limit,
      offset,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('Admin', 'Manager')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePOStatusDto,
  ) {
    return this.poService.updateStatus(id, dto);
  }
}
