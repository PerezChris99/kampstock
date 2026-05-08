import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dailySalesSummary(date: string) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: {
        payments: true,
        createdBy: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    const totalSales = sales.reduce((s, sale) => s + Number(sale.grandTotal), 0);
    const totalCash = sales.flatMap(s => s.payments).filter(p => p.paymentMethod === 'CASH').reduce((s, p) => s + Number(p.amount), 0);
    const totalMobileMoney = sales.flatMap(s => s.payments).filter(p => p.paymentMethod === 'MOBILE_MONEY').reduce((s, p) => s + Number(p.amount), 0);
    const totalCredit = sales.flatMap(s => s.payments).filter(p => p.paymentMethod === 'CREDIT').reduce((s, p) => s + Number(p.amount), 0);

    const byCashier: Record<string, { name: string; count: number; total: number }> = {};
    for (const sale of sales) {
      const key = String(sale.createdBy.id);
      if (!byCashier[key]) byCashier[key] = { name: sale.createdBy.name, count: 0, total: 0 };
      byCashier[key].count++;
      byCashier[key].total += Number(sale.grandTotal);
    }

    return {
      date,
      totalTransactions: sales.length,
      totalSales,
      byPaymentMethod: { cash: totalCash, mobileMoney: totalMobileMoney, credit: totalCredit },
      byCashier: Object.values(byCashier),
    };
  }

  async stockValuation() {
    const items = await this.prisma.stockItem.findMany({
      include: { product: { include: { units: true } }, location: true },
    });

    const rows = items.map(i => ({
      productId: i.productId,
      productName: i.product.name,
      sku: i.product.sku,
      location: i.location.name,
      quantityOnHand: Number(i.quantityOnHand),
      lastCostPrice: Number(i.lastCostPrice),
      value: Number(i.quantityOnHand) * Number(i.lastCostPrice),
    }));

    const totalValue = rows.reduce((s, r) => s + r.value, 0);
    return { items: rows, totalValue };
  }

  async slowMovingItems(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allProducts = await this.prisma.product.findMany({ where: { isActive: true } });
    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { createdAt: { gte: cutoff }, movementType: 'SALE' },
      select: { productId: true, quantity: true },
    });

    const soldQty: Record<number, number> = {};
    for (const m of recentMovements) {
      soldQty[m.productId] = (soldQty[m.productId] ?? 0) + Number(m.quantity);
    }

    return allProducts
      .map(p => ({ id: p.id, name: p.name, sku: p.sku, soldLast30Days: soldQty[p.id] ?? 0 }))
      .sort((a, b) => a.soldLast30Days - b.soldLast30Days)
      .slice(0, 50);
  }

  async monthlyProfitSummary(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: { lines: true },
    });

    const revenue = sales.reduce((s, sale) => s + Number(sale.grandTotal), 0);
    const cogs = sales.flatMap(s => s.lines).reduce((s, l) => s + Number(l.quantity) * Number(l.costPrice), 0);

    const expenses = await this.prisma.expense.findMany({
      where: { paidAt: { gte: start, lte: end } },
    });
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      salesCount: sales.length,
    };
  }
}
