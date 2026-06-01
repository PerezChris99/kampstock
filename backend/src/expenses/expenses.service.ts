import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

export const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Wages', 'Transport', 'Stock Purchase', 'Maintenance', 'Marketing', 'Other'];

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

  async findAll(from?: string, to?: string, category?: string, tenantId?: number) {
    return this.prisma.expense.findMany({
      where: {
        ...(category && { category }),
        ...(tenantId && { tenantId }),
        ...(from && to && {
          paidAt: { gte: new Date(from), lte: new Date(to) },
        }),
      },
      include: { paidBy: { select: { id: true, name: true } } },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getCategories() {
    return EXPENSE_CATEGORIES;
  }

  async getTotals(from?: string, to?: string, tenantId?: number) {
    const expenses = await this.findAll(from, to, undefined, tenantId);
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
    return { total, byCategory, count: expenses.length };
  }
}
