import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateProductUnitDto } from './dto/product.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles('Admin', 'Manager')
  create(@Body() dto: CreateProductDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.productsService.create(dto, actorId, tenantId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.productsService.findAll(search, categoryId ? parseInt(categoryId) : undefined, tenantId, limit, offset);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string, @CurrentUser('tenantId') tenantId: number) {
    return this.productsService.findByBarcode(barcode, tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.productsService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.productsService.update(id, dto, actorId, tenantId);
  }

  @Put(':id/units/:unitId')
  @Roles('Admin', 'Manager')
  updateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: Partial<CreateProductUnitDto>,
    @CurrentUser('id') actorId: number,
  ) {
    return this.productsService.updateUnit(id, unitId, dto, actorId);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.productsService.remove(id, actorId, tenantId);
  }
}
