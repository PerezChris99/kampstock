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
  create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    return this.expensesService.create(dto, actorId, tenantId);
  }

  @Get()
  @Roles('Admin', 'Manager')
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    const limit = Math.min(parseInt(limitStr ?? '100') || 100, 500);
    const offset = parseInt(offsetStr ?? '0') || 0;
    return this.expensesService.findAll(
      from,
      to,
      category,
      tenantId,
      limit,
      offset,
    );
  }

  @Get('categories')
  getCategories() {
    return this.expensesService.getCategories();
  }

  @Get('totals')
  @Roles('Admin', 'Manager')
  getTotals(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    return this.expensesService.getTotals(from, to, tenantId);
  }
}
