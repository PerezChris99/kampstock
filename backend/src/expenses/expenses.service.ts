import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Wages',
  'Transport',
  'Stock Purchase',
  'Maintenance',
  'Marketing',
  'Other',
];

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, actorId: number, tenantId: number) {
    const resolvedDate = dto.expenseDate ?? dto.paidAt;
    return this.prisma.expense.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        paidTo: dto.paidTo,
        tenantId,
        paidById: actorId,
        paidAt: resolvedDate ? new Date(resolvedDate) : undefined,
      },
    });
  }

  async findAll(
    from?: string,
    to?: string,
    category?: string,
    tenantId?: number,
    limit = 100,
    offset = 0,
  ) {
    const where = {
      ...(category && { category }),
      ...(tenantId && { tenantId }),
      ...(from && to && { paidAt: { gte: new Date(from), lte: new Date(to) } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { paidBy: { select: { id: true, name: true } } },
        orderBy: { paidAt: 'desc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  getCategories() {
    return EXPENSE_CATEGORIES;
  }

  async getTotals(from?: string, to?: string, tenantId?: number) {
    // Direct aggregation query — does not use paginated findAll to ensure all expenses are counted
    const where = {
      ...(tenantId && { tenantId }),
      ...(from && to && { paidAt: { gte: new Date(from), lte: new Date(to) } }),
    };
    const expenses = await this.prisma.expense.findMany({
      where,
      select: { amount: true, category: true },
    });
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory = expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
    return { total, byCategory, count: expenses.length };
  }
}
