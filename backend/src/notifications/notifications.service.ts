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
    // 1. Fetch all stock items that have a reorder level configured (single query)
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        location: { tenantId },
        product: { reorderLevel: { gt: 0 } },
      },
      include: {
        product: { select: { id: true, name: true, reorderLevel: true, unitOfMeasure: true } },
      },
    });

    const belowReorder = stockItems.filter(
      (item) => Number(item.quantityOnHand) <= Number(item.product.reorderLevel),
    );
    if (belowReorder.length === 0) return;

    // 2. Batch-fetch all existing unread LOW_STOCK notifications (single query, not N)
    const existing = await this.prisma.notification.findMany({
      where: { tenantId, type: 'LOW_STOCK', isRead: false },
      select: { entityId: true },
    });
    const existingIds = new Set(existing.map((n) => n.entityId));

    // 3. Create only notifications that don't already exist
    await Promise.all(
      belowReorder
        .filter((item) => !existingIds.has(item.productId))
        .map((item) =>
          this.create(
            tenantId,
            'LOW_STOCK',
            `Low stock: ${item.product.name}`,
            `Only ${Number(item.quantityOnHand)} ${item.product.unitOfMeasure}(s) remaining (reorder at ${Number(item.product.reorderLevel)}).`,
            'product',
            item.productId,
          ),
        ),
    );
  }

  /** Check for items expiring within 30 days */
  async checkExpiry(tenantId: number) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    // 1. Fetch all expiring items in one query
    const items = await this.prisma.stockItem.findMany({
      where: {
        location: { tenantId },
        expiryDate: { lte: soon, gte: new Date() },
        quantityOnHand: { gt: 0 },
      },
      include: { product: { select: { id: true, name: true } } },
    });
    if (items.length === 0) return;

    // 2. Batch-fetch all existing unread EXPIRY notifications (single query, not N)
    const existing = await this.prisma.notification.findMany({
      where: { tenantId, type: 'EXPIRY', isRead: false },
      select: { entityId: true },
    });
    const existingIds = new Set(existing.map((n) => n.entityId));

    // 3. Create only missing notifications
    await Promise.all(
      items
        .filter((item) => !existingIds.has(item.productId))
        .map((item) => {
          const days = Math.ceil((item.expiryDate!.getTime() - Date.now()) / 86_400_000);
          return this.create(
            tenantId,
            'EXPIRY',
            `Expiring soon: ${item.product.name}`,
            `${Number(item.quantityOnHand)} units expire in ${days} day(s) (${item.expiryDate!.toLocaleDateString()}).`,
            'product',
            item.productId,
          );
        }),
    );
  }
}
