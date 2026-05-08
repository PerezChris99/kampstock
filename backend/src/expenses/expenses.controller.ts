import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/expense.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @Roles('Admin', 'Manager')
  create(@Body() dto: CreateExpenseDto, @CurrentUser('id') actorId: number) {
    return this.expensesService.create(dto, actorId);
  }

  @Get()
  @Roles('Admin', 'Manager')
  findAll(@Query('from') from?: string, @Query('to') to?: string, @Query('category') category?: string) {
    return this.expensesService.findAll(from, to, category);
  }

  @Get('categories')
  getCategories() {
    return this.expensesService.getCategories();
  }

  @Get('totals')
  @Roles('Admin', 'Manager')
  getTotals(@Query('from') from?: string, @Query('to') to?: string) {
    return this.expensesService.getTotals(from, to);
  }
}
