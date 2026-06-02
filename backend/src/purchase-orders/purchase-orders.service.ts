import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePOStatusDto } from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Collision-safe PO number using random hex suffix.
   * Replaces the count+1 approach that had a race condition under concurrent load.
   */
  private generatePoNumber(): string {
    const date = new Date();
    const prefix = `PO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${suffix}`;
  }

  async create(dto: CreatePurchaseOrderDto, actorId: number, tenantId: number) {
    const { lines, ...poData } = dto;
    const poNumber = this.generatePoNumber();
    return this.prisma.purchaseOrder.create({
      data: {
        ...poData,
        poNumber,
        tenantId,
        createdById: actorId,
        lines: { create: lines },
      },
      include: { supplier: true, lines: { include: { product: true } }, createdBy: { select: { id: true, name: true } } },
    });
  }

  async findAll(supplierId?: number, tenantId?: number, limit = 100, offset = 0) {
    const where = { ...(supplierId && { supplierId }), ...(tenantId && { tenantId }) };
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true, createdBy: { select: { id: true, name: true } } },
        orderBy: { orderedDate: 'desc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: { include: { product: { include: { units: true } } } },
        goodsReceipts: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updateStatus(id: number, dto: UpdatePOStatusDto) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }
}
