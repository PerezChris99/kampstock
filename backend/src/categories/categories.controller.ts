import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Post()
  @Roles('Admin', 'Manager')
  create(@Body() dto: CreateCategoryDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.categoriesService.create(dto, actorId, tenantId);
  }

  @Get()
  findAll(@CurrentUser('tenantId') tenantId?: number) {
    return this.categoriesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.categoriesService.findOne(id, tenantId);
  }

  @Put(':id')
  @Roles('Admin', 'Manager')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.categoriesService.update(id, dto, actorId, tenantId);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.categoriesService.remove(id, actorId, tenantId);
  }
}
