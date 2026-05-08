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
  create(@Body() dto: CreateProductDto, @CurrentUser('id') actorId: number) {
    return this.productsService.create(dto, actorId);
  }

  @Get()
  findAll(@Query('search') search?: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAll(search, categoryId ? parseInt(categoryId) : undefined);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto, @CurrentUser('id') actorId: number) {
    return this.productsService.update(id, dto, actorId);
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
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
    return this.productsService.remove(id, actorId);
  }
}
