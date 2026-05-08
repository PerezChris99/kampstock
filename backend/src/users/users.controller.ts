import { Controller, Get, Post, Param, Patch, Body, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../auth/dto/auth.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('Admin')
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number) {
    return this.usersService.create(dto, actorId);
  }

  @Get()
  @Roles('Admin', 'Manager')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('Admin', 'Manager')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/toggle-active')
  @Roles('Admin')
  toggleActive(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
    return this.usersService.toggleActive(id, actorId);
  }
}
