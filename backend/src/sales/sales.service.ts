import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, AddPaymentDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async generateSaleNumber(tenantId: number): Promise<string> {
    const count = await this.prisma.sale.count({ where: { tenantId } });
    const date = new Date();
    const prefix = `KS${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateSaleDto, actorId: number, tenantId: number) {
    return this.prisma.$transaction(async (tx) => {
      const locationId = dto.locationId ?? 1; // Default to first location

      // Validate and compute totals
      let subtotal = 0;
      const lineData: any[] = [];

      for (const line of dto.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { units: true },
        });
        if (!product) throw new NotFoundException(`Product ${line.productId} not found`);

        // Check stock
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: line.productId, locationId },
        });
        const onHand = stockItem ? Number(stockItem.quantityOnHand) : 0;
        if (!dto.allowNegativeStock && onHand < line.quantity) {
          throw new BadRequestException(`Insufficient stock for product "${product.name}". Available: ${onHand}`);
        }

        const lineTotal = line.quantity * line.unitPrice - (line.discount ?? 0);
        const costPrice = stockItem ? Number(stockItem.lastCostPrice) : 0;
        subtotal += lineTotal;
        lineData.push({ ...line, lineTotal, costPrice });
      }

      const discountTotal = dto.discountTotal ?? 0;
      const taxTotal = 0; // Computed per product in real scenario
      const grandTotal = subtotal - discountTotal + taxTotal;
      const paidAmount = dto.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, grandTotal - paidAmount);

      const saleNumber = await this.generateSaleNumber(tenantId);

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          tenantId,
          customerId: dto.customerId,
          saleType: dto.saleType ?? 'RETAIL',
          status: 'COMPLETED',
          total: subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          paidAmount,
          balance,
          notes: dto.notes,
          createdById: actorId,
          lines: {
            create: lineData.map(l => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount ?? 0,
              lineTotal: l.lineTotal,
              costPrice: l.costPrice,
            })),
          },
          payments: {
            create: dto.payments.map(p => ({
              paymentMethod: p.paymentMethod,
              amount: p.amount,
              paymentReference: p.paymentReference,
              receivedById: actorId,
            })),
          },
        },
        include: { lines: { include: { product: true } }, payments: true },
      });

      // Decrement stock and create movements
      for (const line of lineData) {
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: line.productId, locationId },
        });
        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantityOnHand: Math.max(0, Number(stockItem.quantityOnHand) - line.quantity) },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            fromLocationId: locationId,
            quantity: line.quantity,
            movementType: 'SALE',
            referenceId: sale.id,
            referenceType: 'Sale',
            createdById: actorId,
          },
        });
      }

      // Update customer balance if credit sale
      if (dto.customerId && balance > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { balance: { increment: balance } },
        });
      }

      return sale;
    });
  }

  async findAll(date?: string, cashierId?: number, tenantId?: number, limit = 100, offset = 0, from?: string, to?: string) {
    let dateFilter: any = {};
    if (from && to) {
      dateFilter = { createdAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) } };
    } else if (date) {
      dateFilter = { createdAt: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) } };
    }

    const where = {
      ...dateFilter,
      ...(tenantId && { tenantId }),
      ...(cashierId && { createdById: cashierId }),
    };
    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        lines: { include: { product: { include: { units: true } } } },
        customer: true,
        payments: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async addPayment(saleId: number, dto: AddPaymentDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (!sale) throw new NotFoundException('Sale not found');
      if (Number(sale.balance) <= 0) throw new BadRequestException('Sale is already fully paid');

      const payment = await tx.payment.create({
        data: {
          saleId,
          paymentMethod: dto.paymentMethod,
          amount: dto.amount,
          paymentReference: dto.paymentReference,
          receivedById: actorId,
        },
      });

      const newPaid = Number(sale.paidAmount) + dto.amount;
      const newBalance = Math.max(0, Number(sale.grandTotal) - newPaid);

      await tx.sale.update({
        where: { id: saleId },
        data: { paidAmount: newPaid, balance: newBalance },
      });

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: dto.amount } },
        });
      }

      return payment;
    });
  }

  async returnSale(saleId: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { lines: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'RETURNED') throw new BadRequestException('Sale already returned');

      await tx.sale.update({ where: { id: saleId }, data: { status: 'RETURNED' } });

      // Reverse stock movements
      for (const line of sale.lines) {
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: line.productId },
        });
        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantityOnHand: { increment: Number(line.quantity) } },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            quantity: line.quantity,
            movementType: 'RETURN_IN',
            referenceId: saleId,
            referenceType: 'Sale',
            createdById: actorId,
          },
        });
      }

      return { success: true, saleId };
    });
  }
}
