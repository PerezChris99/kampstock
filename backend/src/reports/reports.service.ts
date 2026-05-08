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

  async salesTrend(days = 30) {
    const results: { date: string; total: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const start = new Date(`${dateStr}T00:00:00`);
      const end = new Date(`${dateStr}T23:59:59`);
      const sales = await this.prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' }, select: { grandTotal: true } });
      results.push({ date: dateStr, total: sales.reduce((s, sale) => s + Number(sale.grandTotal), 0), count: sales.length });
    }
    return results;
  }

  async topProducts(limit = 10, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const lines = await this.prisma.saleLine.findMany({
      where: { sale: { createdAt: { gte: cutoff }, status: 'COMPLETED' } },
      include: { product: { select: { name: true, sku: true } } },
    });
    const map: Record<number, { productName: string; sku: string; revenue: number; quantity: number; profit: number }> = {};
    for (const l of lines) {
      if (!map[l.productId]) map[l.productId] = { productName: l.product.name, sku: l.product.sku, revenue: 0, quantity: 0, profit: 0 };
      map[l.productId].revenue += Number(l.lineTotal);
      map[l.productId].quantity += Number(l.quantity);
      map[l.productId].profit += (Number(l.unitPrice) - Number(l.costPrice)) * Number(l.quantity);
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }

  async paymentBreakdown(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const payments = await this.prisma.payment.findMany({
      where: { receivedAt: { gte: cutoff } },
      select: { paymentMethod: true, amount: true },
    });
    const map: Record<string, number> = {};
    for (const p of payments) {
      map[p.paymentMethod] = (map[p.paymentMethod] ?? 0) + Number(p.amount);
    }
    return Object.entries(map).map(([method, total]) => ({ method, total }));
  }

  async categorySales(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const lines = await this.prisma.saleLine.findMany({
      where: { sale: { createdAt: { gte: cutoff }, status: 'COMPLETED' } },
      include: { product: { include: { category: true } } },
    });
    const map: Record<string, { category: string; revenue: number; quantity: number }> = {};
    for (const l of lines) {
      const cat = l.product.category?.name ?? 'Uncategorised';
      if (!map[cat]) map[cat] = { category: cat, revenue: 0, quantity: 0 };
      map[cat].revenue += Number(l.lineTotal);
      map[cat].quantity += Number(l.quantity);
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  async monthlySummary(months = 6) {
    const results: Awaited<ReturnType<typeof this.monthlyProfitSummary>>[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() + 1 - i;
      const actualYear = month <= 0 ? year - 1 : year;
      const actualMonth = month <= 0 ? 12 + month : month;
      const data = await this.monthlyProfitSummary(actualYear, actualMonth);
      results.push(data);
    }
    return results;
  }

  async kpiOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart); yesterdayEnd.setMilliseconds(-1);

    const [todaySales, yesterdaySales, lowStockItems, allStock] = await Promise.all([
      this.prisma.sale.findMany({ where: { createdAt: { gte: todayStart }, status: 'COMPLETED' }, select: { grandTotal: true } }),
      this.prisma.sale.findMany({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, status: 'COMPLETED' }, select: { grandTotal: true } }),
      this.prisma.stockItem.count({ where: { quantityOnHand: { lte: 10 } } }),
      this.prisma.stockItem.findMany({ include: { product: { include: { units: { where: { isDefault: true } } } } } }),
    ]);

    const todayTotal = todaySales.reduce((s, sale) => s + Number(sale.grandTotal), 0);
    const yesterdayTotal = yesterdaySales.reduce((s, sale) => s + Number(sale.grandTotal), 0);
    const totalStockValue = allStock.reduce((sum, item) => sum + Number(item.lastCostPrice) * Number(item.quantityOnHand), 0);

    return {
      todaySales: todayTotal,
      todayTransactions: todaySales.length,
      yesterdaySales: yesterdayTotal,
      salesGrowth: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
      lowStockCount: lowStockItems,
      totalStockValue,
    };
  }
}
