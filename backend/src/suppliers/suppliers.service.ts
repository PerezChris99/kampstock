import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async findAll(search?: string) {
    return this.prisma.supplier.findMany({
      where: {
        isActive: true,
        ...(search && { name: { contains: search } }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
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

  async update(id: number, dto: UpdateSupplierDto) {
    await this.findOne(id);
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
