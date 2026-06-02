import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, tenantId: number) {
    return this.prisma.customer.create({ data: { ...dto, tenantId } });
  }

  async findAll(search?: string, tenantId?: number, limit = 200, offset = 0) {
    const where = {
      isActive: true,
      ...(tenantId && { tenantId }),
      ...(search && { name: { contains: search } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        take: Math.min(limit, 1000),
        skip: offset,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number, tenantId?: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
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

  async update(id: number, dto: UpdateCustomerDto, tenantId: number) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async getAgeing(id: number, tenantId?: number) {
    const now = new Date();
    const sales = await this.prisma.sale.findMany({
      where: { customerId: id, balance: { gt: 0 }, ...(tenantId && { tenantId }) },
      select: { id: true, saleNumber: true, grandTotal: true, balance: true, createdAt: true },
    });

    return sales.map((s) => {
      const daysOld = Math.floor((now.getTime() - s.createdAt.getTime()) / 86400000);
      const bucket = daysOld <= 30 ? '0-30' : daysOld <= 60 ? '31-60' : daysOld <= 90 ? '61-90' : '90+';
      return { ...s, daysOld, agingBucket: bucket };
    });
  }

  /** Full credit ledger: all sales with payment breakdown */
  async getLedger(id: number, tenantId?: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const sales = await this.prisma.sale.findMany({
      where: { customerId: id, ...(tenantId && { tenantId }) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, saleNumber: true, grandTotal: true, paidAmount: true,
        balance: true, createdAt: true, status: true,
        payments: {
          select: { id: true, paymentMethod: true, amount: true, receivedAt: true },
          orderBy: { receivedAt: 'asc' },
        },
      },
    });

    return { customer, sales, totalOutstanding: Number(customer.balance) };
  }

  /**
   * Record a debt repayment for a customer.
   * Applies payment FIFO across outstanding sales and updates customer.balance.
   */
  async recordPayment(
    customerId: number,
    amount: number,
    paymentMethod: string,
    receivedById: number,
    tenantId: number,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (Number(customer.balance) <= 0) throw new BadRequestException('No outstanding balance');

    // Get oldest unpaid sales first
    const outstanding = await this.prisma.sale.findMany({
      where: { customerId, tenantId, balance: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });

    let remaining = amount;
    for (const sale of outstanding) {
      if (remaining <= 0) break;
      const saleBalance = Number(sale.balance);
      const apply = Math.min(remaining, saleBalance);

      await this.prisma.payment.create({
        data: {
          saleId: sale.id,
          paymentMethod,
          amount: apply,
          receivedById,
        },
      });

      await this.prisma.sale.update({
        where: { id: sale.id },
        data: {
          paidAmount: { increment: apply },
          balance: { decrement: apply },
        },
      });

      remaining -= apply;
    }

    const applied = amount - remaining;
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: applied } },
    });

    return { applied, remaining, newBalance: Number(customer.balance) - applied };
  }
}

