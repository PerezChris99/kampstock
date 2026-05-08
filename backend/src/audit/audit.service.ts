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
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        previousValue: previousValue ?? undefined,
        newValue: newValue ?? undefined,
        ipAddress,
      },
    });
  }

  async findAll(entityType?: string, entityId?: number) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
      include: { user: { select: { id: true, name: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
