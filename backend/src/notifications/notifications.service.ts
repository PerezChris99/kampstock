import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenantId: number,
    type: string,
    title: string,
    body: string,
    entityType?: string,
    entityId?: number,
  ) {
    return this.prisma.notification.create({
      data: { tenantId, type, title, body, entityType, entityId },
    });
  }

  async findAll(tenantId: number) {
    return this.prisma.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(tenantId: number) {
    return this.prisma.notification.count({ where: { tenantId, isRead: false } });
  }

  async markRead(id: number, tenantId: number) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { isRead: true },
    });
  }

  async markAllRead(tenantId: number) {
    return this.prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true },
    });
  }

  /** Check for low-stock items and create notifications (call after each sale) */
  async checkLowStock(tenantId: number) {
    const lowStockItems = await this.prisma.stockItem.findMany({
      where: { location: { tenantId } },
      include: { product: true },
    });

    for (const item of lowStockItems) {
      const reorder = Number(item.product.reorderLevel);
      if (reorder > 0 && Number(item.quantityOnHand) <= reorder) {
        // Only create if no unread LOW_STOCK notification exists for this product
        const existing = await this.prisma.notification.findFirst({
          where: { tenantId, type: 'LOW_STOCK', entityId: item.productId, isRead: false },
        });
        if (!existing) {
          await this.create(
            tenantId,
            'LOW_STOCK',
            `Low stock: ${item.product.name}`,
            `Only ${Number(item.quantityOnHand)} ${item.product.unitOfMeasure}(s) remaining (reorder at ${reorder}).`,
            'product',
            item.productId,
          );
        }
      }
    }
  }

  /** Check for items expiring within 30 days */
  async checkExpiry(tenantId: number) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const items = await this.prisma.stockItem.findMany({
      where: {
        location: { tenantId },
        expiryDate: { lte: soon, gte: new Date() },
        quantityOnHand: { gt: 0 },
      },
      include: { product: true },
    });

    for (const item of items) {
      const existing = await this.prisma.notification.findFirst({
        where: { tenantId, type: 'EXPIRY', entityId: item.productId, isRead: false },
      });
      if (!existing) {
        const days = Math.ceil((item.expiryDate!.getTime() - Date.now()) / 86_400_000);
        await this.create(
          tenantId,
          'EXPIRY',
          `Expiring soon: ${item.product.name}`,
          `${Number(item.quantityOnHand)} units expire in ${days} day(s) (${item.expiryDate!.toLocaleDateString()}).`,
          'product',
          item.productId,
        );
      }
    }
  }
}
