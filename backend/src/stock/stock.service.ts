import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStockLocationDto, StockAdjustmentDto, StockTransferDto } from './dto/stock.dto';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Locations ─────────────────────────────────────────────────────────────

  async createLocation(dto: CreateStockLocationDto, tenantId: number) {
    return this.prisma.stockLocation.create({ data: { ...dto, tenantId } });
  }

  async findAllLocations(tenantId?: number) {
    return this.prisma.stockLocation.findMany({ where: { isActive: true, ...(tenantId && { tenantId }) }, orderBy: { id: 'asc' } });
  }

  // ─── Stock items ────────────────────────────────────────────────────────────

  async findStockItems(locationId?: number, productId?: number, tenantId?: number) {
    return this.prisma.stockItem.findMany({
      where: {
        ...(locationId && { locationId }),
        ...(productId && { productId }),
        ...(tenantId && { location: { tenantId } }),
      },
      include: { product: { include: { units: true } }, location: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getLowStockItems(threshold = 10, tenantId?: number) {
    return this.prisma.stockItem.findMany({
      where: { quantityOnHand: { lte: threshold }, ...(tenantId && { location: { tenantId } }) },
      include: { product: { include: { units: true } }, location: true },
      orderBy: { quantityOnHand: 'asc' },
    });
  }

  async getExpiringItems(daysAhead = 30, tenantId?: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.prisma.stockItem.findMany({
      where: { expiryDate: { lte: cutoff }, quantityOnHand: { gt: 0 }, ...(tenantId && { location: { tenantId } }) },
      include: { product: true, location: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ─── Adjustments ────────────────────────────────────────────────────────────

  async adjust(dto: StockAdjustmentDto, actorId: number, tenantId: number) {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.stockLocation.findFirst({ where: { id: dto.locationId, tenantId } });
      if (!location) throw new NotFoundException('Location not found');

      const product = await tx.product.findFirst({ where: { id: dto.productId, tenantId } });
      if (!product) throw new NotFoundException('Product not found');

      const stockItem = await tx.stockItem.findFirst({
        where: { productId: dto.productId, locationId: dto.locationId, batchNo: dto.batchNo ?? null },
      });

      if (stockItem) {
        if (dto.quantity < 0) {
          const decremented = await tx.stockItem.updateMany({
            where: {
              id: stockItem.id,
              quantityOnHand: { gte: Math.abs(dto.quantity) },
            },
            data: { quantityOnHand: { decrement: Math.abs(dto.quantity) } },
          });
          if (decremented.count !== 1) {
            throw new BadRequestException('Stock changed concurrently; please retry the adjustment');
          }
        } else if (dto.quantity > 0) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantityOnHand: { increment: dto.quantity } },
          });
        }
      } else {
        if (dto.quantity < 0) {
          throw new BadRequestException('Insufficient stock for this adjustment');
        }
        await tx.stockItem.create({
          data: {
            productId: dto.productId,
            locationId: dto.locationId,
            quantityOnHand: dto.quantity,
            batchNo: dto.batchNo,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          },
        });
      }

      const resultingItem = await tx.stockItem.findFirst({
        where: { productId: dto.productId, locationId: dto.locationId, batchNo: dto.batchNo ?? null },
        select: { id: true, quantityOnHand: true },
      });
      const newQty = resultingItem ? Number(resultingItem.quantityOnHand) : 0;

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          toLocationId: dto.quantity > 0 ? dto.locationId : undefined,
          fromLocationId: dto.quantity < 0 ? dto.locationId : undefined,
          quantity: Math.abs(dto.quantity),
          movementType: dto.movementType,
          createdById: actorId,
          notes: dto.notes,
        },
      });

      await this.audit.log(actorId, 'STOCK_ADJUSTMENT', 'StockItem', resultingItem?.id ?? stockItem?.id ?? null, { qty: stockItem?.quantityOnHand }, { qty: newQty }, undefined, tenantId);
      return { success: true, newQuantity: newQty };
    });
  }

  async transfer(dto: StockTransferDto, actorId: number, tenantId: number) {
    return this.prisma.$transaction(async (tx) => {
      const [fromLocation, toLocation, product] = await Promise.all([
        tx.stockLocation.findFirst({ where: { id: dto.fromLocationId, tenantId }, select: { id: true } }),
        tx.stockLocation.findFirst({ where: { id: dto.toLocationId, tenantId }, select: { id: true } }),
        tx.product.findFirst({ where: { id: dto.productId, tenantId }, select: { id: true } }),
      ]);
      if (!fromLocation || !toLocation) throw new BadRequestException('Both stock locations must belong to this tenant');
      if (!product) throw new BadRequestException('Product not found for this tenant');
      if (dto.fromLocationId === dto.toLocationId) throw new BadRequestException('Source and destination locations must differ');

      const fromItem = await tx.stockItem.findFirst({
        where: { productId: dto.productId, locationId: dto.fromLocationId, location: { tenantId } },
      });
      if (!fromItem || Number(fromItem.quantityOnHand) < dto.quantity) {
        throw new BadRequestException('Insufficient stock at source location');
      }

      const decremented = await tx.stockItem.updateMany({
        where: { id: fromItem.id, quantityOnHand: { gte: dto.quantity } },
        data: { quantityOnHand: { decrement: dto.quantity } },
      });
      if (decremented.count !== 1) throw new BadRequestException('Stock changed concurrently; please retry the transfer');

      const toItem = await tx.stockItem.findFirst({
        where: { productId: dto.productId, locationId: dto.toLocationId, location: { tenantId } },
      });

      if (toItem) {
        await tx.stockItem.update({
          where: { id: toItem.id },
          data: { quantityOnHand: Number(toItem.quantityOnHand) + dto.quantity },
        });
      } else {
        await tx.stockItem.create({
          data: { productId: dto.productId, locationId: dto.toLocationId, quantityOnHand: dto.quantity },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          quantity: dto.quantity,
          movementType: 'TRANSFER',
          createdById: actorId,
          notes: dto.notes,
        },
      });

      return { success: true };
    });
  }

  async findMovements(productId?: number, locationId?: number, tenantId?: number, limit = 100) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(productId && { productId }),
        ...(tenantId && { product: { tenantId } }),
        ...(locationId && {
          OR: [
            { fromLocationId: locationId, fromLocation: { tenantId } },
            { toLocationId: locationId, toLocation: { tenantId } },
          ],
        }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
