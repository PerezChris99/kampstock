import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGoodsReceiptDto,
  CreateSupplierInvoiceDto,
} from './dto/goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGoodsReceiptDto, actorId: number, tenantId: number) {
    return this.prisma.$transaction(async (tx) => {
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
            batchNo: line.batchNo ?? null,
          },
        });

        if (existing) {
          await tx.stockItem.update({
            where: { id: existing.id },
            data: {
              quantityOnHand: Number(existing.quantityOnHand) + line.quantity,
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

      // Mark PO as received if applicable
      if (dto.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: 'RECEIVED' },
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

  async findOne(id: number) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
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

  async createInvoice(dto: CreateSupplierInvoiceDto) {
    const balance = dto.totalAmount - (dto.paidAmount ?? 0);
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
