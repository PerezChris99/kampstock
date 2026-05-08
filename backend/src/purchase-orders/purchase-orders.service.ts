import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePOStatusDto } from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto, actorId: number) {
    const { lines, ...poData } = dto;
    return this.prisma.purchaseOrder.create({
      data: {
        ...poData,
        createdById: actorId,
        lines: { create: lines },
      },
      include: { supplier: true, lines: { include: { product: true } }, createdBy: { select: { id: true, name: true } } },
    });
  }

  async findAll(supplierId?: number) {
    return this.prisma.purchaseOrder.findMany({
      where: { ...(supplierId && { supplierId }) },
      include: { supplier: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { orderedDate: 'desc' },
    });
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
