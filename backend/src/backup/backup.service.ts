import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Compute SHA-256 checksum of the backup tables payload */
function computeChecksum(tables: object): string {
  return crypto.createHash('sha256').update(JSON.stringify(tables)).digest('hex');
}

@Injectable()
export class BackupService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Export a tenant-scoped backup.
   * Only exports data belonging to the requesting tenant — never exposes
   * other tenants' data. Includes a SHA-256 checksum for integrity verification.
   */
  async exportBackup(actorId: number, ip: string, tenantId: number) {
    const [
      roles, users, categories, products, productUnits,
      stockLocations, stockItems, suppliers, customers,
      purchaseOrders, purchaseOrderLines, expenses, sales, saleLines, payments,
    ] = await Promise.all([
      this.prisma.role.findMany({ where: { tenantId } }),
      // passwordHash intentionally excluded — restore issues temp passwords for security
      this.prisma.user.findMany({
        where: { tenantId },
        select: { id: true, name: true, username: true, phone: true, roleId: true, tenantId: true, isActive: true, createdAt: true },
      }),
      this.prisma.category.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId } }),
      this.prisma.productUnit.findMany({ where: { product: { tenantId } } }),
      this.prisma.stockLocation.findMany({ where: { tenantId } }),
      this.prisma.stockItem.findMany({ where: { location: { tenantId } } }),
      this.prisma.supplier.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.purchaseOrder.findMany({ where: { tenantId } }),
      this.prisma.purchaseOrderLine.findMany({ where: { purchaseOrder: { tenantId } } }),
      this.prisma.expense.findMany({ where: { tenantId } }),
      this.prisma.sale.findMany({ where: { tenantId } }),
      this.prisma.saleLine.findMany({ where: { sale: { tenantId } } }),
      this.prisma.payment.findMany({ where: { sale: { tenantId } } }),
    ]);

    const tables = {
      roles, users, categories, products, productUnits,
      stockLocations, stockItems, suppliers, customers,
      purchaseOrders, purchaseOrderLines, expenses, sales, saleLines, payments,
    };

    const rowCounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(tables)) {
      rowCounts[k] = (v as any[]).length;
    }

    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      system: 'KampStock',
      tenantId,
      rowCounts,
      checksum: computeChecksum(tables),
      tables,
    };

    const filename = `kampstock-backup-tenant${tenantId}-${new Date().toISOString().split('T')[0]}.json`;
    this.audit
      .log(actorId, 'BACKUP_EXPORT', 'System', null, null, { filename, tenantId, rowCounts }, ip, tenantId)
      .catch(() => {});
    return { data, filename };
  }

  /**
   * Restore a tenant-scoped backup.
   * ONLY deletes and re-inserts data for the requesting tenant.
   * Never touches other tenants' data or global system tables.
   * Verifies checksum before proceeding.
   */
  async restoreBackup(
    data: any,
    actorId: number,
    ip: string,
    tenantId: number,
  ): Promise<{ message: string; summary: Record<string, number>; tempPasswords: Record<string, string> }> {
    if (!data?.tables || data?.system !== 'KampStock') {
      throw new BadRequestException('Invalid backup file format');
    }

    // Tenant ownership check — backup must belong to this tenant
    if (data.tenantId !== undefined && data.tenantId !== tenantId) {
      throw new ForbiddenException('This backup belongs to a different tenant');
    }

    // Checksum verification (v2.0+ backups)
    if (data.version === '2.0' && data.checksum) {
      const computed = computeChecksum(data.tables);
      if (computed !== data.checksum) {
        throw new BadRequestException('Backup integrity check failed — checksum mismatch. File may be corrupted or tampered with.');
      }
    }

    const summary: Record<string, number> = {};
    const tempPasswords: Record<string, string> = {};

    // Restore in dependency order — only wipe THIS tenant's data
    await this.prisma.$transaction(async (tx) => {
      // Clear tenant-scoped data in reverse dependency order
      await tx.payment.deleteMany({ where: { sale: { tenantId } } });
      await tx.saleLine.deleteMany({ where: { sale: { tenantId } } });
      await tx.sale.deleteMany({ where: { tenantId } });
      await tx.expense.deleteMany({ where: { tenantId } });
      await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { tenantId } } });
      await tx.purchaseOrder.deleteMany({ where: { tenantId } });
      await tx.stockItem.deleteMany({ where: { location: { tenantId } } });
      await tx.stockLocation.deleteMany({ where: { tenantId } });
      await tx.productUnit.deleteMany({ where: { product: { tenantId } } });
      await tx.product.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.supplier.deleteMany({ where: { tenantId } });
      await tx.category.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });

      // Re-insert roles
      for (const role of data.tables.roles ?? []) {
        await tx.role.create({ data: { ...role, tenantId } });
      }
      summary.roles = (data.tables.roles ?? []).length;

      // Restore users with fresh temp passwords (export excludes passwordHash for security)
      for (const user of data.tables.users ?? []) {
        const tempPwd = `Ks${crypto.randomBytes(4).toString('hex').toUpperCase()}!`;
        const hash = await bcrypt.hash(tempPwd, 10);
        tempPasswords[user.username] = tempPwd;
        await tx.user.create({
          data: {
            id: user.id,
            name: user.name,
            username: user.username,
            phone: user.phone ?? null,
            roleId: user.roleId,
            tenantId,
            isActive: user.isActive,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            passwordHash: hash,
          },
        });
      }
      summary.users = (data.tables.users ?? []).length;

      for (const cat of data.tables.categories ?? []) {
        await tx.category.create({ data: { id: cat.id, name: cat.name, parentId: cat.parentId, tenantId, createdAt: new Date(cat.createdAt), updatedAt: new Date(cat.updatedAt) } });
      }
      summary.categories = (data.tables.categories ?? []).length;

      for (const p of data.tables.products ?? []) {
        await tx.product.create({ data: { id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, categoryId: p.categoryId, tenantId, brand: p.brand, description: p.description, unitOfMeasure: p.unitOfMeasure, allowFractional: p.allowFractional, hasExpiry: p.hasExpiry, defaultTaxRate: p.defaultTaxRate, isActive: p.isActive, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) } });
      }
      summary.products = (data.tables.products ?? []).length;

      for (const pu of data.tables.productUnits ?? []) {
        await tx.productUnit.create({ data: { id: pu.id, productId: pu.productId, unitName: pu.unitName, conversionFactor: pu.conversionFactor, buyingPrice: pu.buyingPrice, sellingPriceRetail: pu.sellingPriceRetail, sellingPriceWholesale: pu.sellingPriceWholesale, minWholesaleQty: pu.minWholesaleQty, isDefault: pu.isDefault } });
      }
      summary.productUnits = (data.tables.productUnits ?? []).length;

      for (const loc of data.tables.stockLocations ?? []) {
        await tx.stockLocation.create({ data: { id: loc.id, name: loc.name, description: loc.description, tenantId, isActive: loc.isActive, createdAt: new Date(loc.createdAt) } });
      }
      for (const si of data.tables.stockItems ?? []) {
        await tx.stockItem.create({ data: { id: si.id, productId: si.productId, locationId: si.locationId, quantityOnHand: si.quantityOnHand, batchNo: si.batchNo, expiryDate: si.expiryDate ? new Date(si.expiryDate) : null, lastCostPrice: si.lastCostPrice, updatedAt: new Date(si.updatedAt) } });
      }
      summary.stockItems = (data.tables.stockItems ?? []).length;

      for (const sup of data.tables.suppliers ?? []) {
        await tx.supplier.create({ data: { id: sup.id, name: sup.name, contactPerson: sup.contactPerson, phone: sup.phone, email: sup.email, address: sup.address, tin: sup.tin, tenantId, balance: sup.balance, isActive: sup.isActive, createdAt: new Date(sup.createdAt), updatedAt: new Date(sup.updatedAt) } });
      }
      summary.suppliers = (data.tables.suppliers ?? []).length;

      for (const cust of data.tables.customers ?? []) {
        await tx.customer.create({ data: { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email, address: cust.address, tin: cust.tin, tenantId, isWholesale: cust.isWholesale, creditLimit: cust.creditLimit, balance: cust.balance, isActive: cust.isActive, createdAt: new Date(cust.createdAt), updatedAt: new Date(cust.updatedAt) } });
      }
      summary.customers = (data.tables.customers ?? []).length;

      for (const po of data.tables.purchaseOrders ?? []) {
        await tx.purchaseOrder.create({ data: { id: po.id, poNumber: po.poNumber, supplierId: po.supplierId, tenantId, status: po.status, orderedDate: new Date(po.orderedDate), expectedDate: po.expectedDate ? new Date(po.expectedDate) : null, grandTotal: po.grandTotal, notes: po.notes, createdById: po.createdById, createdAt: new Date(po.createdAt), updatedAt: new Date(po.updatedAt) } });
      }
      for (const pol of data.tables.purchaseOrderLines ?? []) {
        await tx.purchaseOrderLine.create({ data: { id: pol.id, purchaseOrderId: pol.purchaseOrderId, productId: pol.productId, quantity: pol.quantity, unitPrice: pol.unitPrice, discount: pol.discount, lineTotal: pol.lineTotal } });
      }

      for (const exp of data.tables.expenses ?? []) {
        await tx.expense.create({ data: { id: exp.id, tenantId, category: exp.category, description: exp.description, amount: exp.amount, paidTo: exp.paidTo, paidById: exp.paidById, paidAt: new Date(exp.paidAt), createdAt: new Date(exp.createdAt) } });
      }
      summary.expenses = (data.tables.expenses ?? []).length;

      for (const sale of data.tables.sales ?? []) {
        await tx.sale.create({ data: { id: sale.id, saleNumber: sale.saleNumber, tenantId, customerId: sale.customerId, saleType: sale.saleType, status: sale.status, total: sale.total, discountTotal: sale.discountTotal, taxTotal: sale.taxTotal, grandTotal: sale.grandTotal, paidAmount: sale.paidAmount, balance: sale.balance, notes: sale.notes, createdById: sale.createdById, createdAt: new Date(sale.createdAt), updatedAt: new Date(sale.updatedAt) } });
      }
      for (const sl of data.tables.saleLines ?? []) {
        await tx.saleLine.create({ data: { id: sl.id, saleId: sl.saleId, productId: sl.productId, productUnitId: sl.productUnitId, quantity: sl.quantity, unitPrice: sl.unitPrice, discount: sl.discount, lineTotal: sl.lineTotal, costPrice: sl.costPrice } });
      }
      for (const pay of data.tables.payments ?? []) {
        await tx.payment.create({ data: { id: pay.id, saleId: pay.saleId, paymentMethod: pay.paymentMethod, amount: pay.amount, paymentReference: pay.paymentReference, receivedAt: new Date(pay.receivedAt), receivedById: pay.receivedById } });
      }
      summary.sales = (data.tables.sales ?? []).length;
    });

    this.audit
      .log(actorId, 'BACKUP_RESTORE', 'System', null, null, { exportedAt: data.exportedAt, tenantId, summary }, ip, tenantId)
      .catch(() => {});
    return {
      message: `Backup restored successfully from ${data.exportedAt}. All user passwords have been reset — distribute the tempPasswords map and ask users to change immediately.`,
      summary,
      tempPasswords,
    };
  }

  async getStatus(tenantId?: number) {
    const [salesCount, productsCount, stockValue] = await Promise.all([
      this.prisma.sale.count({ where: tenantId ? { tenantId } : {} }),
      this.prisma.product.count({ where: tenantId ? { tenantId } : {} }),
      this.prisma.stockItem.findMany({
        where: tenantId ? { location: { tenantId } } : {},
        include: { product: { include: { units: { where: { isDefault: true } } } } },
      }),
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
