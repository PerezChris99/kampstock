import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, tenantId: number) {
    return this.prisma.supplier.create({ data: { ...dto, tenantId } });
  }

  async findAll(search?: string, tenantId?: number, limit = 100, offset = 0) {
    const where = {
      isActive: true,
      ...(tenantId && { tenantId }),
      ...(search && { name: { contains: search } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number, tenantId?: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      include: {
        purchaseOrders: {
          orderBy: { orderedDate: 'desc' },
          take: 20,
          include: { lines: { include: { product: true } } },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto, tenantId: number) {
    await this.findOne(id, tenantId);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async getBalance(id: number) {
    const invoices = await this.prisma.supplierInvoice.findMany({
      where: { goodsReceipt: { purchaseOrder: { supplierId: id } } },
      select: { totalAmount: true, paidAmount: true, balance: true },
    });
    const totalOwed = invoices.reduce((s, i) => s + Number(i.balance), 0);
    return { supplierId: id, totalOutstanding: totalOwed };
  }
}
