import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: {
        isActive: true,
        ...(search && { name: { contains: search } }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          where: { balance: { gt: 0 } },
          select: { id: true, saleNumber: true, grandTotal: true, paidAmount: true, balance: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async getAgeing(id: number) {
    const now = new Date();
    const sales = await this.prisma.sale.findMany({
      where: { customerId: id, balance: { gt: 0 } },
      select: { id: true, saleNumber: true, grandTotal: true, balance: true, createdAt: true },
    });

    return sales.map((s) => {
      const daysOld = Math.floor((now.getTime() - s.createdAt.getTime()) / 86400000);
      const bucket = daysOld <= 30 ? '0-30' : daysOld <= 60 ? '31-60' : daysOld <= 90 ? '61-90' : '90+';
      return { ...s, daysOld, agingBucket: bucket };
    });
  }
}
