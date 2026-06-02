import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dailySalesSummary(date: string, tenantId?: number) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED', ...(tenantId && { tenantId }) },
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

  async stockValuation(tenantId?: number) {
    const items = await this.prisma.stockItem.findMany({
      where: { ...(tenantId && { location: { tenantId } }) },
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

  async slowMovingItems(days = 30, tenantId?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allProducts = await this.prisma.product.findMany({ where: { isActive: true, ...(tenantId && { tenantId }) } });
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

  async monthlyProfitSummary(year: number, month: number, tenantId?: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const tenantFilter = tenantId ? { tenantId } : {};

    // Run all three aggregations in parallel (no full record loading)
    const [revenueAgg, saleLines, expenseAgg] = await Promise.all([
      // 1. Revenue via aggregate — DB does the summation
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED', ...tenantFilter },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      // 2. COGS — select only the two columns needed (no full sale joins)
      this.prisma.saleLine.findMany({
        where: { sale: { createdAt: { gte: start, lte: end }, status: 'COMPLETED', ...tenantFilter } },
        select: { quantity: true, costPrice: true },
      }),
      // 3. Expenses via aggregate
      this.prisma.expense.aggregate({
        where: { paidAt: { gte: start, lte: end }, ...tenantFilter },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(revenueAgg._sum.grandTotal ?? 0);
    const cogs = saleLines.reduce((s, l) => s + Number(l.quantity) * Number(l.costPrice), 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      revenue, cogs, grossProfit, totalExpenses, netProfit,
      salesCount: revenueAgg._count.id,
    };
  }

  async salesTrend(days = 30, tenantId?: number) {
    // Single query instead of N sequential queries (one per day)
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: { gte: start },
        status: 'COMPLETED',
        ...(tenantId && { tenantId }),
      },
      select: { grandTotal: true, createdAt: true },
    });

    // Pre-build map with all dates initialised to zero so days with no sales appear
    const byDate = new Map<string, { total: number; count: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDate.set(d.toISOString().split('T')[0], { total: 0, count: 0 });
    }

    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      const entry = byDate.get(key);
      if (entry) {
        entry.total += Number(sale.grandTotal);
        entry.count++;
      }
    }

    return Array.from(byDate.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async topProducts(limit = 10, days = 30, tenantId?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const lines = await this.prisma.saleLine.findMany({
      where: { sale: { createdAt: { gte: cutoff }, status: 'COMPLETED', ...(tenantId && { tenantId }) } },
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

  async paymentBreakdown(days = 30, tenantId?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const payments = await this.prisma.payment.findMany({
      where: { receivedAt: { gte: cutoff }, ...(tenantId && { sale: { tenantId } }) },
      select: { paymentMethod: true, amount: true },
    });
    const map: Record<string, number> = {};
    for (const p of payments) {
      map[p.paymentMethod] = (map[p.paymentMethod] ?? 0) + Number(p.amount);
    }
    return Object.entries(map).map(([method, total]) => ({ method, total }));
  }

  async categorySales(days = 30, tenantId?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const lines = await this.prisma.saleLine.findMany({
      where: { sale: { createdAt: { gte: cutoff }, status: 'COMPLETED', ...(tenantId && { tenantId }) } },
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

  async monthlySummary(months = 6, tenantId?: number) {
    const now = new Date();
    // Run all months in parallel instead of sequential await inside a loop
    const promises: Promise<Awaited<ReturnType<typeof this.monthlyProfitSummary>>>[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      promises.push(this.monthlyProfitSummary(d.getFullYear(), d.getMonth() + 1, tenantId));
    }
    return Promise.all(promises);
  }

  async kpiOverview(tenantId?: number) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart); yesterdayEnd.setMilliseconds(-1);

    const [todaySales, yesterdaySales, lowStockItems, allStock] = await Promise.all([
      this.prisma.sale.findMany({ where: { createdAt: { gte: todayStart }, status: 'COMPLETED', ...(tenantId && { tenantId }) }, select: { grandTotal: true } }),
      this.prisma.sale.findMany({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, status: 'COMPLETED', ...(tenantId && { tenantId }) }, select: { grandTotal: true } }),
      this.prisma.stockItem.count({ where: { quantityOnHand: { lte: 10 }, ...(tenantId && { location: { tenantId } }) } }),
      this.prisma.stockItem.findMany({ where: { ...(tenantId && { location: { tenantId } }) }, include: { product: { include: { units: { where: { isDefault: true } } } } } }),
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

  async expiringItems(days = 30, tenantId?: number) {
    const soon = new Date();
    soon.setDate(soon.getDate() + days);

    const items = await this.prisma.stockItem.findMany({
      where: {
        expiryDate: { lte: soon },
        quantityOnHand: { gt: 0 },
        ...(tenantId && { location: { tenantId } }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: { select: { name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return items.map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      sku: i.product.sku,
      location: i.location.name,
      batchNo: i.batchNo,
      quantityOnHand: Number(i.quantityOnHand),
      expiryDate: i.expiryDate,
      daysLeft: i.expiryDate
        ? Math.ceil((i.expiryDate.getTime() - Date.now()) / 86_400_000)
        : null,
    }));
  }
}

