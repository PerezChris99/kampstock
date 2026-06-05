import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: number | null,
    action: string,
    entityType: string,
    entityId: number | null,
    previousValue: any,
    newValue: any,
    ipAddress?: string,
    tenantId?: number,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        previousValue: previousValue != null ? JSON.stringify(previousValue) : undefined,
        newValue: newValue != null ? JSON.stringify(newValue) : undefined,
        ipAddress,
        ...(tenantId && { tenantId }),
      },
    });
  }

  async findAll(
    entityType?: string,
    entityId?: number,
    tenantId?: number,
    page = 1,
    limit = 50,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;
    const where = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(tenantId && { tenantId }),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
  }
}
