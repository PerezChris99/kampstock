import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';

export const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Wages', 'Transport', 'Stock Purchase', 'Maintenance', 'Marketing', 'Other'];

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, actorId: number) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        paidById: actorId,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });
  }

  async findAll(from?: string, to?: string, category?: string) {
    return this.prisma.expense.findMany({
      where: {
        ...(category && { category }),
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

  async getTotals(from?: string, to?: string) {
    const expenses = await this.findAll(from, to);
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
    return { total, byCategory, count: expenses.length };
  }
}
