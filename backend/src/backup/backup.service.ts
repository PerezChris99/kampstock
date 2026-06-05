import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Compute SHA-256 checksum of the backup tables payload */
function computeChecksum(tables: object): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(tables))
    .digest('hex');
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
      roles,
      users,
      categories,
      products,
      productUnits,
      stockLocations,
      stockItems,
      suppliers,
      customers,
      purchaseOrders,
      purchaseOrderLines,
      expenses,
      sales,
      saleLines,
      payments,
    ] = await Promise.all([
      this.prisma.role.findMany({ where: { tenantId } }),
      // passwordHash intentionally excluded — restore issues temp passwords for security
      this.prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          roleId: true,
          tenantId: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.category.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId } }),
      this.prisma.productUnit.findMany({ where: { product: { tenantId } } }),
      this.prisma.stockLocation.findMany({ where: { tenantId } }),
      this.prisma.stockItem.findMany({ where: { location: { tenantId } } }),
      this.prisma.supplier.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.purchaseOrder.findMany({ where: { tenantId } }),
      this.prisma.purchaseOrderLine.findMany({
        where: { purchaseOrder: { tenantId } },
      }),
      this.prisma.expense.findMany({ where: { tenantId } }),
      this.prisma.sale.findMany({ where: { tenantId } }),
      this.prisma.saleLine.findMany({ where: { sale: { tenantId } } }),
      this.prisma.payment.findMany({ where: { sale: { tenantId } } }),
    ]);

    const tables = {
      roles,
      users,
      categories,
      products,
      productUnits,
      stockLocations,
      stockItems,
      suppliers,
      customers,
      purchaseOrders,
      purchaseOrderLines,
      expenses,
      sales,
      saleLines,
      payments,
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
      .log(
        actorId,
        'BACKUP_EXPORT',
        'System',
        null,
        null,
        { filename, tenantId, rowCounts },
        ip,
        tenantId,
      )
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
  ): Promise<{
    message: string;
    summary: Record<string, number>;
    tempPasswords: Record<string, string>;
  }> {
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
        throw new BadRequestException(
          'Backup integrity check failed — checksum mismatch. File may be corrupted or tampered with.',
        );
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
      await tx.purchaseOrderLine.deleteMany({
        where: { purchaseOrder: { tenantId } },
      });
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
      // Users must be sequential — bcrypt hashing is async and CPU-bound
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

      // ── Bulk inserts via createMany (dramatically faster than per-row create) ──

      const categories = (data.tables.categories ?? []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId ?? null,
        tenantId,
        createdAt: new Date(cat.createdAt),
        updatedAt: new Date(cat.updatedAt),
      }));
      if (categories.length)
        await tx.category.createMany({
          data: categories,
        });
      summary.categories = categories.length;

      const products = (data.tables.products ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode ?? null,
        categoryId: p.categoryId,
        tenantId,
        brand: p.brand ?? null,
        description: p.description ?? null,
        unitOfMeasure: p.unitOfMeasure,
        allowFractional: p.allowFractional ?? false,
        hasExpiry: p.hasExpiry ?? false,
        defaultTaxRate: p.defaultTaxRate ?? 0,
        reorderLevel: p.reorderLevel ?? 0,
        isActive: p.isActive ?? true,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
      if (products.length)
        await tx.product.createMany({ data: products });
      summary.products = products.length;

      const productUnits = (data.tables.productUnits ?? []).map((pu: any) => ({
        id: pu.id,
        productId: pu.productId,
        unitName: pu.unitName,
        conversionFactor: pu.conversionFactor,
        buyingPrice: pu.buyingPrice,
        sellingPriceRetail: pu.sellingPriceRetail,
        sellingPriceWholesale: pu.sellingPriceWholesale,
        minWholesaleQty: pu.minWholesaleQty ?? null,
        isDefault: pu.isDefault ?? false,
      }));
      if (productUnits.length)
        await tx.productUnit.createMany({
          data: productUnits,
        });
      summary.productUnits = productUnits.length;

      const stockLocations = (data.tables.stockLocations ?? []).map(
        (loc: any) => ({
          id: loc.id,
          name: loc.name,
          description: loc.description ?? null,
          tenantId,
          isActive: loc.isActive ?? true,
          createdAt: new Date(loc.createdAt),
        }),
      );
      if (stockLocations.length)
        await tx.stockLocation.createMany({
          data: stockLocations,
        });

      const stockItems = (data.tables.stockItems ?? []).map((si: any) => ({
        id: si.id,
        productId: si.productId,
        locationId: si.locationId,
        quantityOnHand: si.quantityOnHand,
        batchNo: si.batchNo ?? null,
        expiryDate: si.expiryDate ? new Date(si.expiryDate) : null,
        lastCostPrice: si.lastCostPrice ?? 0,
        updatedAt: new Date(si.updatedAt),
      }));
      if (stockItems.length)
        await tx.stockItem.createMany({
          data: stockItems,
        });
      summary.stockItems = stockItems.length;

      const suppliers = (data.tables.suppliers ?? []).map((sup: any) => ({
        id: sup.id,
        name: sup.name,
        contactPerson: sup.contactPerson ?? null,
        phone: sup.phone ?? null,
        email: sup.email ?? null,
        address: sup.address ?? null,
        tin: sup.tin ?? null,
        tenantId,
        balance: sup.balance ?? 0,
        isActive: sup.isActive ?? true,
        createdAt: new Date(sup.createdAt),
        updatedAt: new Date(sup.updatedAt),
      }));
      if (suppliers.length)
        await tx.supplier.createMany({ data: suppliers });
      summary.suppliers = suppliers.length;

      const customers = (data.tables.customers ?? []).map((cust: any) => ({
        id: cust.id,
        name: cust.name,
        phone: cust.phone ?? null,
        email: cust.email ?? null,
        address: cust.address ?? null,
        tin: cust.tin ?? null,
        tenantId,
        isWholesale: cust.isWholesale ?? false,
        creditLimit: cust.creditLimit ?? 0,
        balance: cust.balance ?? 0,
        isActive: cust.isActive ?? true,
        createdAt: new Date(cust.createdAt),
        updatedAt: new Date(cust.updatedAt),
      }));
      if (customers.length)
        await tx.customer.createMany({ data: customers });
      summary.customers = customers.length;

      const purchaseOrders = (data.tables.purchaseOrders ?? []).map(
        (po: any) => ({
          id: po.id,
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          tenantId,
          status: po.status,
          orderedDate: new Date(po.orderedDate),
          expectedDate: po.expectedDate ? new Date(po.expectedDate) : null,
          grandTotal: po.grandTotal,
          notes: po.notes ?? null,
          createdById: po.createdById,
          createdAt: new Date(po.createdAt),
          updatedAt: new Date(po.updatedAt),
        }),
      );
      if (purchaseOrders.length)
        await tx.purchaseOrder.createMany({
          data: purchaseOrders,
        });

      const purchaseOrderLines = (data.tables.purchaseOrderLines ?? []).map(
        (pol: any) => ({
          id: pol.id,
          purchaseOrderId: pol.purchaseOrderId,
          productId: pol.productId,
          quantity: pol.quantity,
          unitPrice: pol.unitPrice,
          discount: pol.discount ?? 0,
          lineTotal: pol.lineTotal,
        }),
      );
      if (purchaseOrderLines.length)
        await tx.purchaseOrderLine.createMany({
          data: purchaseOrderLines,
        });

      const expenses = (data.tables.expenses ?? []).map((exp: any) => ({
        id: exp.id,
        tenantId,
        category: exp.category,
        description: exp.description ?? null,
        amount: exp.amount,
        paidTo: exp.paidTo ?? null,
        paidById: exp.paidById,
        paidAt: new Date(exp.paidAt),
        createdAt: new Date(exp.createdAt),
      }));
      if (expenses.length)
        await tx.expense.createMany({ data: expenses });
      summary.expenses = expenses.length;

      const sales = (data.tables.sales ?? []).map((sale: any) => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        tenantId,
        customerId: sale.customerId ?? null,
        saleType: sale.saleType,
        status: sale.status,
        total: sale.total,
        discountTotal: sale.discountTotal ?? 0,
        taxTotal: sale.taxTotal ?? 0,
        grandTotal: sale.grandTotal,
        paidAmount: sale.paidAmount,
        balance: sale.balance ?? 0,
        notes: sale.notes ?? null,
        createdById: sale.createdById,
        createdAt: new Date(sale.createdAt),
        updatedAt: new Date(sale.updatedAt),
      }));
      if (sales.length)
        await tx.sale.createMany({ data: sales });

      const saleLines = (data.tables.saleLines ?? []).map((sl: any) => ({
        id: sl.id,
        saleId: sl.saleId,
        productId: sl.productId,
        productUnitId: sl.productUnitId ?? null,
        quantity: sl.quantity,
        unitPrice: sl.unitPrice,
        discount: sl.discount ?? 0,
        lineTotal: sl.lineTotal,
        costPrice: sl.costPrice ?? 0,
      }));
      if (saleLines.length)
        await tx.saleLine.createMany({ data: saleLines });

      const payments = (data.tables.payments ?? []).map((pay: any) => ({
        id: pay.id,
        saleId: pay.saleId,
        paymentMethod: pay.paymentMethod,
        amount: pay.amount,
        paymentReference: pay.paymentReference ?? null,
        receivedAt: new Date(pay.receivedAt),
        receivedById: pay.receivedById,
      }));
      if (payments.length)
        await tx.payment.createMany({ data: payments });
      summary.sales = sales.length;
    });

    this.audit
      .log(
        actorId,
        'BACKUP_RESTORE',
        'System',
        null,
        null,
        { exportedAt: data.exportedAt, tenantId, summary },
        ip,
        tenantId,
      )
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
        include: {
          product: { include: { units: { where: { isDefault: true } } } },
        },
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
