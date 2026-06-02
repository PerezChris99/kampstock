import { Controller, Get, Post, Param, Patch, Body, Query, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../auth/dto/auth.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('Admin')
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number, @CurrentUser('tenantId') tenantId: number) {
    return this.usersService.create(dto, actorId, tenantId);
  }

  @Get()
  @Roles('Admin', 'Manager')
  findAll(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.usersService.findAll(tenantId, limit, offset);
  }

  @Get(':id')
  @Roles('Admin', 'Manager')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id/toggle-active')
  @Roles('Admin')
  toggleActive(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
    return this.usersService.toggleActive(id, actorId);
  }
}
