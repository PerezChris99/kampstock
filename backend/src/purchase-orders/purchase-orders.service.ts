import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePurchaseOrderDto,
  UpdatePOStatusDto,
  POStatus,
} from './dto/purchase-order.dto';

/**
 * Allowed status transitions. RECEIVED and CANCELLED are terminal.
 * PARTIAL/RECEIVED are normally set by the goods-receipt flow, but Admin/
 * Manager may also set them manually (e.g. reconciling an offline delivery).
 */
const STATUS_TRANSITIONS: Record<string, POStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
  PARTIAL: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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
    // Supplier must exist and belong to this tenant (blocks cross-tenant refs)
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    // All referenced products must exist and belong to this tenant
    const productIds = [...new Set(dto.lines.map((l) => l.productId))];
    const productCount = await this.prisma.product.count({
      where: { id: { in: productIds }, tenantId },
    });
    if (productCount !== productIds.length) {
      throw new BadRequestException(
        'One or more products do not exist for this tenant',
      );
    }

    // Server-side total calculation — NEVER trust client-provided totals.
    // lineTotal = quantity * unitPrice - discount (floored at 0 is NOT
    // allowed: an over-discount is treated as invalid input instead).
    const lines = dto.lines.map((l) => {
      const discount = l.discount ?? 0;
      const lineTotal =
        Math.round((l.quantity * l.unitPrice - discount) * 100) / 100;
      if (lineTotal < 0) {
        throw new BadRequestException(
          `Discount cannot exceed line amount for product ${l.productId}`,
        );
      }
      return {
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount,
        lineTotal,
      };
    });
    const grandTotal =
      Math.round(lines.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;

    const poNumber = this.generatePoNumber();
    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        poNumber,
        grandTotal,
        tenantId,
        createdById: actorId,
        lines: { create: lines },
      },
      include: {
        supplier: true,
        lines: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Audit trail (fire-and-forget — never blocks the response)
    this.audit
      .log(
        actorId,
        'PO_CREATE',
        'PurchaseOrder',
        po.id,
        null,
        { poNumber, supplierId: dto.supplierId, grandTotal, lines: lines.length },
        undefined,
        tenantId,
      )
      .catch(() => {});

    return po;
  }

  async findAll(supplierId?: number, tenantId?: number, limit = 100, offset = 0, status?: string) {
    const where = {
      ...(supplierId && { supplierId }),
      ...(tenantId && { tenantId }),
      ...(status && { status }),
    };
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

  async findOne(id: number, tenantId?: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      // Tenant-scoped lookup — prevents cross-tenant reads by id guessing
      where: { id, ...(tenantId && { tenantId }) },
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

  async updateStatus(
    id: number,
    dto: UpdatePOStatusDto,
    actorId?: number,
    tenantId?: number,
  ) {
    const po = await this.findOne(id, tenantId);

    if (po.status === dto.status) return po; // no-op

    const allowed = STATUS_TRANSITIONS[po.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from ${po.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: dto.status },
      include: {
        supplier: true,
        lines: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.audit
      .log(
        actorId ?? null,
        'PO_STATUS_CHANGE',
        'PurchaseOrder',
        po.id,
        { status: po.status },
        { status: dto.status },
        undefined,
        tenantId ?? po.tenantId,
      )
      .catch(() => {});

    return updated;
  }
}
