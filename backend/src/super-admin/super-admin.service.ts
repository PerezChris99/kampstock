import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  /** Platform-wide dashboard stats */
  async dashboardStats() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalProducts,
      totalSalesCount,
      totalRevenueAgg,
      trialTenants,
      recentTenants,
      revenueByPlan,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
      this.prisma.sale.aggregate({ where: { status: 'COMPLETED' }, _sum: { grandTotal: true } }),
      this.prisma.tenant.count({
        where: { isActive: true, trialEndsAt: { gt: new Date() } },
      }),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, subdomain: true, plan: true, isActive: true, createdAt: true },
      }),
      // Revenue breakdown per plan (approximate via tenant count)
      this.prisma.tenant.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
    ]);

    return {
      totals: {
        tenants: totalTenants,
        activeTenants,
        suspendedTenants: totalTenants - activeTenants,
        trialTenants,
        users: totalUsers,
        products: totalProducts,
        sales: totalSalesCount,
        revenue: totalRevenueAgg._sum.grandTotal ?? 0,
      },
      recentTenants,
      tenantsByPlan: revenueByPlan.map((r) => ({ plan: r.plan, count: r._count.id })),
    };
  }

  /** All tenants with per-tenant stats */
  async allTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, subdomain: true, plan: true, isActive: true,
        ownerEmail: true, trialEndsAt: true, planExpiresAt: true, createdAt: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, status: true, confirmedAt: true, expiresAt: true,
            plan: true, amount: true, periodMonths: true,
          },
        },
      },
    });

    // Attach lightweight stats for each tenant
    const withStats = await Promise.all(
      tenants.map(async (t) => {
        const [users, sales, revenue] = await Promise.all([
          this.prisma.user.count({ where: { tenantId: t.id } }),
          this.prisma.sale.count({ where: { tenantId: t.id, status: 'COMPLETED' } }),
          this.prisma.sale.aggregate({
            where: { tenantId: t.id, status: 'COMPLETED' },
            _sum: { grandTotal: true },
          }),
        ]);
        return {
          ...t,
          stats: { users, sales, revenue: revenue._sum.grandTotal ?? 0 },
        };
      }),
    );

    return withStats;
  }

  /** Suspend or reinstate a tenant */
  async toggleTenant(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
      select: { id: true, name: true, subdomain: true, isActive: true },
    });
  }

  /** Change a tenant's plan */
  async updatePlan(id: number, plan: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { plan },
      select: { id: true, name: true, plan: true },
    });
  }

  /** Promote a user to super-admin by username */
  async promoteToSuperAdmin(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { username },
      data: { isSuperAdmin: true },
      select: { id: true, name: true, username: true, isSuperAdmin: true },
    });
  }

  /** Audit log across all tenants */
  async auditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, tenantId: true, userId: true, action: true,
          entityType: true, entityId: true, createdAt: true,
          user: { select: { name: true, username: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}
