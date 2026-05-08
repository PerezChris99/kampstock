import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async exportBackup() {
    const [
      roles, users, categories, products, productUnits,
      stockLocations, stockItems, suppliers, customers,
      purchaseOrders, purchaseOrderLines, expenses, sales, saleLines, payments,
    ] = await Promise.all([
      this.prisma.role.findMany(),
      this.prisma.user.findMany({ select: { id: true, name: true, username: true, passwordHash: true, phone: true, roleId: true, isActive: true, createdAt: true } }),
      this.prisma.category.findMany(),
      this.prisma.product.findMany(),
      this.prisma.productUnit.findMany(),
      this.prisma.stockLocation.findMany(),
      this.prisma.stockItem.findMany(),
      this.prisma.supplier.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.purchaseOrder.findMany(),
      this.prisma.purchaseOrderLine.findMany(),
      this.prisma.expense.findMany(),
      this.prisma.sale.findMany(),
      this.prisma.saleLine.findMany(),
      this.prisma.payment.findMany(),
    ]);

    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      system: 'KampStock',
      tables: {
        roles, users, categories, products, productUnits,
        stockLocations, stockItems, suppliers, customers,
        purchaseOrders, purchaseOrderLines, expenses, sales, saleLines, payments,
      },
    };

    const filename = `kampstock-backup-${new Date().toISOString().split('T')[0]}.json`;
    return { data, filename };
  }

  async restoreBackup(data: any): Promise<{ message: string; summary: Record<string, number> }> {
    if (!data?.tables || data?.system !== 'KampStock') {
      throw new Error('Invalid backup file format');
    }

    const summary: Record<string, number> = {};

    // Restore in dependency order — wipe and re-insert
    await this.prisma.$transaction(async (tx) => {
      // Clear in reverse order
      await tx.payment.deleteMany();
      await tx.saleLine.deleteMany();
      await tx.sale.deleteMany();
      await tx.expense.deleteMany();
      await tx.purchaseOrderLine.deleteMany();
      await tx.purchaseOrder.deleteMany();
      await tx.stockItem.deleteMany();
      await tx.productUnit.deleteMany();
      await tx.product.deleteMany();
      await tx.customer.deleteMany();
      await tx.supplier.deleteMany();
      await tx.stockLocation.deleteMany();
      await tx.category.deleteMany();
      await tx.user.deleteMany();
      await tx.role.deleteMany();

      // Re-insert
      for (const role of data.tables.roles ?? []) { await tx.role.create({ data: role }); }
      summary.roles = (data.tables.roles ?? []).length;

      for (const user of data.tables.users ?? []) { await tx.user.create({ data: user }); }
      summary.users = (data.tables.users ?? []).length;

      for (const cat of data.tables.categories ?? []) { await tx.category.create({ data: { id: cat.id, name: cat.name, parentId: cat.parentId, createdAt: new Date(cat.createdAt), updatedAt: new Date(cat.updatedAt) } }); }
      summary.categories = (data.tables.categories ?? []).length;

      for (const p of data.tables.products ?? []) { await tx.product.create({ data: { id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, categoryId: p.categoryId, brand: p.brand, description: p.description, unitOfMeasure: p.unitOfMeasure, allowFractional: p.allowFractional, hasExpiry: p.hasExpiry, defaultTaxRate: p.defaultTaxRate, isActive: p.isActive, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) } }); }
      summary.products = (data.tables.products ?? []).length;

      for (const pu of data.tables.productUnits ?? []) { await tx.productUnit.create({ data: { id: pu.id, productId: pu.productId, unitName: pu.unitName, conversionFactor: pu.conversionFactor, buyingPrice: pu.buyingPrice, sellingPriceRetail: pu.sellingPriceRetail, sellingPriceWholesale: pu.sellingPriceWholesale, minWholesaleQty: pu.minWholesaleQty, isDefault: pu.isDefault } }); }
      summary.productUnits = (data.tables.productUnits ?? []).length;

      for (const loc of data.tables.stockLocations ?? []) { await tx.stockLocation.create({ data: { id: loc.id, name: loc.name, description: loc.description, isActive: loc.isActive, createdAt: new Date(loc.createdAt) } }); }
      for (const si of data.tables.stockItems ?? []) { await tx.stockItem.create({ data: { id: si.id, productId: si.productId, locationId: si.locationId, quantityOnHand: si.quantityOnHand, batchNo: si.batchNo, expiryDate: si.expiryDate ? new Date(si.expiryDate) : null, lastCostPrice: si.lastCostPrice, updatedAt: new Date(si.updatedAt) } }); }
      summary.stockItems = (data.tables.stockItems ?? []).length;

      for (const sup of data.tables.suppliers ?? []) { await tx.supplier.create({ data: { id: sup.id, name: sup.name, contactPerson: sup.contactPerson, phone: sup.phone, email: sup.email, address: sup.address, tin: sup.tin, balance: sup.balance, isActive: sup.isActive, createdAt: new Date(sup.createdAt), updatedAt: new Date(sup.updatedAt) } }); }
      summary.suppliers = (data.tables.suppliers ?? []).length;

      for (const cust of data.tables.customers ?? []) { await tx.customer.create({ data: { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email, address: cust.address, tin: cust.tin, isWholesale: cust.isWholesale, creditLimit: cust.creditLimit, balance: cust.balance, isActive: cust.isActive, createdAt: new Date(cust.createdAt), updatedAt: new Date(cust.updatedAt) } }); }
      summary.customers = (data.tables.customers ?? []).length;

      for (const po of data.tables.purchaseOrders ?? []) { await tx.purchaseOrder.create({ data: { id: po.id, poNumber: po.poNumber, supplierId: po.supplierId, status: po.status, orderedDate: new Date(po.orderedDate), expectedDate: po.expectedDate ? new Date(po.expectedDate) : null, grandTotal: po.grandTotal, notes: po.notes, createdById: po.createdById, createdAt: new Date(po.createdAt), updatedAt: new Date(po.updatedAt) } }); }
      for (const pol of data.tables.purchaseOrderLines ?? []) { await tx.purchaseOrderLine.create({ data: { id: pol.id, purchaseOrderId: pol.purchaseOrderId, productId: pol.productId, quantity: pol.quantity, unitPrice: pol.unitPrice, discount: pol.discount, lineTotal: pol.lineTotal } }); }

      for (const exp of data.tables.expenses ?? []) { await tx.expense.create({ data: { id: exp.id, category: exp.category, description: exp.description, amount: exp.amount, paidTo: exp.paidTo, paidById: exp.paidById, paidAt: new Date(exp.paidAt), createdAt: new Date(exp.createdAt) } }); }
      summary.expenses = (data.tables.expenses ?? []).length;

      for (const sale of data.tables.sales ?? []) { await tx.sale.create({ data: { id: sale.id, saleNumber: sale.saleNumber, customerId: sale.customerId, saleType: sale.saleType, status: sale.status, total: sale.total, discountTotal: sale.discountTotal, taxTotal: sale.taxTotal, grandTotal: sale.grandTotal, paidAmount: sale.paidAmount, balance: sale.balance, notes: sale.notes, createdById: sale.createdById, createdAt: new Date(sale.createdAt), updatedAt: new Date(sale.updatedAt) } }); }
      for (const sl of data.tables.saleLines ?? []) { await tx.saleLine.create({ data: { id: sl.id, saleId: sl.saleId, productId: sl.productId, productUnitId: sl.productUnitId, quantity: sl.quantity, unitPrice: sl.unitPrice, discount: sl.discount, lineTotal: sl.lineTotal, costPrice: sl.costPrice } }); }
      for (const pay of data.tables.payments ?? []) { await tx.payment.create({ data: { id: pay.id, saleId: pay.saleId, paymentMethod: pay.paymentMethod, amount: pay.amount, paymentReference: pay.paymentReference, receivedAt: new Date(pay.receivedAt), receivedById: pay.receivedById } }); }
      summary.sales = (data.tables.sales ?? []).length;
    });

    return { message: `Backup restored successfully from ${data.exportedAt}`, summary };
  }

  async getStatus() {
    const [salesCount, productsCount, stockValue] = await Promise.all([
      this.prisma.sale.count(),
      this.prisma.product.count(),
      this.prisma.stockItem.findMany({ include: { product: { include: { units: { where: { isDefault: true } } } } } }),
    ]);

    const totalStockValue = stockValue.reduce((sum, item) => {
      const cost = Number(item.product.units[0]?.buyingPrice ?? 0);
      return sum + cost * Number(item.quantityOnHand);
    }, 0);

    return {
      totalSales: salesCount,
      totalProducts: productsCount,
      totalStockValue,
      lastBackupRecommended: new Date().toISOString(),
    };
  }
}
