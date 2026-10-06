import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGoodsReceiptDto,
  CreateSupplierInvoiceDto,
} from './dto/goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGoodsReceiptDto, actorId: number, tenantId: number) {
    // Validate the linked PO up-front: must belong to this tenant and must
    // not be in a terminal state (RECEIVED / CANCELLED).
    if (dto.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, tenantId },
        select: { id: true, status: true },
      });
      if (!po) throw new BadRequestException('Purchase order not found');
      if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
        throw new BadRequestException(
          `Cannot receive goods against a ${po.status} purchase order`,
        );
      }
    }

    // Every product and destination location must belong to this tenant.
    const productIds = [...new Set(dto.lines.map((l) => l.productId))];
    const [productCount, location] = await Promise.all([
      this.prisma.product.count({ where: { id: { in: productIds }, tenantId } }),
      this.prisma.stockLocation.findFirst({ where: { id: dto.locationId, tenantId }, select: { id: true } }),
    ]);
    if (productCount !== productIds.length) throw new BadRequestException('One or more products do not exist for this tenant');
    if (!location) throw new BadRequestException('Stock location not found');

    return this.prisma.$transaction(async (tx) => {
      // Re-check the PO inside the transaction to close the validation-to-write
      // race where another receipt could finalize/cancel it after the initial read.
      if (dto.purchaseOrderId) {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, tenantId },
          select: { id: true, status: true },
        });
        if (!po) throw new BadRequestException('Purchase order not found');
        if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
          throw new BadRequestException(
            `Cannot receive goods against a ${po.status} purchase order`,
          );
        }
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: dto.purchaseOrderId,
          tenantId,
          notes: dto.notes,
          receivedById: actorId,
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
              batchNo: l.batchNo,
            })),
          },
        },
        include: { lines: true },
      });

      // Update stock items and create movements
      for (const line of dto.lines) {
        const existing = await tx.stockItem.findFirst({
          where: {
            productId: line.productId,
            locationId: dto.locationId,
            location: { tenantId },
            batchNo: line.batchNo ?? null,
          },
        });

        if (existing) {
          await tx.stockItem.update({
            where: { id: existing.id },
            data: {
              quantityOnHand: { increment: line.quantity },
              lastCostPrice: line.unitCost,
            },
          });
        } else {
          await tx.stockItem.create({
            data: {
              productId: line.productId,
              locationId: dto.locationId,
              quantityOnHand: line.quantity,
              lastCostPrice: line.unitCost,
              batchNo: line.batchNo,
              expiryDate: line.expiryDate
                ? new Date(line.expiryDate)
                : undefined,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            toLocationId: dto.locationId,
            quantity: line.quantity,
            movementType: 'PURCHASE',
            referenceId: receipt.id,
            referenceType: 'GoodsReceipt',
            createdById: actorId,
          },
        });
      }

      // Update the PO status based on how much has been received so far
      // (across ALL receipts for this PO, including this one):
      //   every ordered line fully received → RECEIVED, otherwise → PARTIAL.
      if (dto.purchaseOrderId) {
        const [poLines, receiptLines] = await Promise.all([
          tx.purchaseOrderLine.findMany({
            where: { purchaseOrderId: dto.purchaseOrderId },
            select: { productId: true, quantity: true },
          }),
          tx.goodsReceiptLine.findMany({
            where: { goodsReceipt: { purchaseOrderId: dto.purchaseOrderId } },
            select: { productId: true, quantity: true },
          }),
        ]);

        const receivedByProduct = new Map<number, number>();
        for (const rl of receiptLines) {
          receivedByProduct.set(
            rl.productId,
            (receivedByProduct.get(rl.productId) ?? 0) + Number(rl.quantity),
          );
        }
        const fullyReceived = poLines.every(
          (pl) =>
            (receivedByProduct.get(pl.productId) ?? 0) >= Number(pl.quantity),
        );

        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: fullyReceived ? 'RECEIVED' : 'PARTIAL' },
        });
      }

      return receipt;
    });
  }

  async findAll(tenantId?: number, limit = 50, offset = 0) {
    const where = { ...(tenantId && { tenantId }) };
    const [data, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          receivedBy: { select: { id: true, name: true } },
          purchaseOrder: { include: { supplier: true } },
          supplierInvoice: true,
        },
        orderBy: { receiptDate: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);
    return { data, total, limit: Math.min(limit, 200), offset };
  }

  async findOne(id: number, tenantId: number) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, tenantId },
      include: {
        lines: { include: { product: true } },
        receivedBy: { select: { id: true, name: true } },
        purchaseOrder: { include: { supplier: true } },
        supplierInvoice: true,
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  async createInvoice(dto: CreateSupplierInvoiceDto, tenantId: number) {
    const balance = dto.totalAmount - (dto.paidAmount ?? 0);
    if (balance < 0) throw new BadRequestException('Paid amount cannot exceed invoice total');
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
    if (!supplier) throw new BadRequestException('Supplier not found');
    if (dto.goodsReceiptId) {
      const receipt = await this.prisma.goodsReceipt.findFirst({ where: { id: dto.goodsReceiptId, tenantId }, select: { id: true } });
      if (!receipt) throw new BadRequestException('Goods receipt not found');
    }
    return this.prisma.supplierInvoice.create({
      data: {
        supplierId: dto.supplierId,
        goodsReceiptId: dto.goodsReceiptId,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        totalAmount: dto.totalAmount,
        paidAmount: dto.paidAmount ?? 0,
        balance,
      },
    });
  }
}
