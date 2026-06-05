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
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { grandTotal: true },
      }),
      this.prisma.tenant.count({
        where: { isActive: true, trialEndsAt: { gt: new Date() } },
      }),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          subdomain: true,
          plan: true,
          isActive: true,
          createdAt: true,
        },
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
      tenantsByPlan: revenueByPlan.map((r) => ({
        plan: r.plan,
        count: r._count.id,
      })),
    };
  }

  /** All tenants with per-tenant stats */
  async allTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        plan: true,
        isActive: true,
        ownerEmail: true,
        ownerPhone: true,
        address: true,
        businessType: true,
        description: true,
        trialEndsAt: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            confirmedAt: true,
            expiresAt: true,
            plan: true,
            amount: true,
            periodMonths: true,
          },
        },
      },
    });

    // Attach lightweight stats for each tenant
    const withStats = await Promise.all(
      tenants.map(async (t) => {
        const [users, sales, revenue] = await Promise.all([
          this.prisma.user.count({ where: { tenantId: t.id } }),
          this.prisma.sale.count({
            where: { tenantId: t.id, status: 'COMPLETED' },
          }),
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
          id: true,
          tenantId: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { name: true, username: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  /** MRR + signup trend for last 12 months */
  async mrrAnalytics() {
    const months: {
      month: string;
      mrr: number;
      signups: number;
      churn: number;
    }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [revenue, signups, expired] = await Promise.all([
        this.prisma.subscription.aggregate({
          where: { status: 'PAID', confirmedAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.tenant.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.tenant.count({
          where: {
            planExpiresAt: { gte: start, lte: end },
            subscriptions: {
              none: { status: 'PAID', confirmedAt: { gte: start } },
            },
          },
        }),
      ]);

      months.push({
        month: label,
        mrr: Number(revenue._sum.amount ?? 0),
        signups,
        churn: expired,
      });
    }

    return months;
  }

  /** Announcements CRUD */
  async getAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(data: {
    title: string;
    body: string;
    severity?: string;
    targetPlan?: string;
    expiresAt?: string;
  }) {
    return this.prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        severity: data.severity ?? 'info',
        targetPlan: data.targetPlan,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async updateAnnouncement(
    id: number,
    data: {
      title?: string;
      body?: string;
      severity?: string;
      targetPlan?: string;
      isActive?: boolean;
      expiresAt?: string;
    },
  ) {
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.targetPlan !== undefined && { targetPlan: data.targetPlan }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
      },
    });
  }

  async deleteAnnouncement(id: number) {
    await this.prisma.announcement.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Account Lock Management ─────────────────────────────────────────────────

  /** List all account locks (active by default, or all) */
  async getAccountLocks(activeOnly = true, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = activeOnly ? { isActive: true } : {};
    const [locks, total] = await Promise.all([
      this.prisma.accountLock.findMany({
        where,
        orderBy: { lockedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              isActive: true,
              role: { select: { name: true } },
            },
          },
          unlockedBy: { select: { id: true, name: true, username: true } },
        },
      }),
      this.prisma.accountLock.count({ where }),
    ]);
    return { locks, total, page, pages: Math.ceil(total / limit) };
  }

  /** Get full detail on one lock record */
  async getAccountLock(id: number) {
    const lock = await this.prisma.accountLock.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            role: { select: { name: true } },
          },
        },
        unlockedBy: { select: { id: true, name: true, username: true } },
      },
    });
    if (!lock) throw new NotFoundException('Lock record not found');

    // Pull recent audit events for the locked user
    const recentAudit = lock.userId
      ? await this.prisma.auditLog.findMany({
          where: { userId: lock.userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            action: true,
            entityType: true,
            createdAt: true,
            ipAddress: true,
          },
        })
      : [];

    return { lock, recentAudit };
  }

  /** Admin manually unlocks an account — clears in-memory block is handled by auth.service on next login */
  async unlockAccount(lockId: number, adminId: number, notes?: string) {
    const lock = await this.prisma.accountLock.findUnique({
      where: { id: lockId },
    });
    if (!lock) throw new NotFoundException('Lock record not found');

    const updated = await this.prisma.accountLock.update({
      where: { id: lockId },
      data: {
        isActive: false,
        unlockedAt: new Date(),
        unlockedById: adminId,
        ...(notes && { notes }),
      },
    });

    // Audit the admin action
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ACCOUNT_UNLOCK',
        entityType: 'AccountLock',
        entityId: lockId,
        previousValue: JSON.stringify({ isActive: true }),
        newValue: JSON.stringify({ isActive: false, unlockedById: adminId }),
        ipAddress: null,
      },
    });

    return updated;
  }

  /** Admin locks an account manually */
  async adminLockAccount(data: {
    username: string;
    reason: string;
    notes?: string;
    lockedUntil?: string;
    adminId: number;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    const lock = await this.prisma.accountLock.create({
      data: {
        username: data.username,
        userId: user?.id ?? null,
        reason: 'ADMIN_LOCK',
        triggerSource: 'ADMIN',
        failCount: 0,
        lockedUntil: data.lockedUntil ? new Date(data.lockedUntil) : null,
        notes: data.notes,
        metadata: JSON.stringify({
          adminId: data.adminId,
          adminReason: data.reason,
        }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: data.adminId,
        action: 'ACCOUNT_LOCK',
        entityType: 'AccountLock',
        entityId: lock.id,
        previousValue: null,
        newValue: JSON.stringify({
          username: data.username,
          reason: data.reason,
        }),
        ipAddress: null,
      },
    });

    return lock;
  }

  /** Force a password reset flag on a user */
  async forcePasswordReset(userId: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { forcePasswordReset: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'FORCE_PASSWORD_RESET',
        entityType: 'User',
        entityId: userId,
        previousValue: JSON.stringify({ forcePasswordReset: false }),
        newValue: JSON.stringify({ forcePasswordReset: true }),
        ipAddress: null,
      },
    });

    return { success: true, userId };
  }

  /** Flag a user account for investigation */
  async flagAccount(userId: number, adminId: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { flaggedForReview: true, flagReason: reason },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ACCOUNT_FLAGGED',
        entityType: 'User',
        entityId: userId,
        previousValue: JSON.stringify({ flaggedForReview: false }),
        newValue: JSON.stringify({ flaggedForReview: true, reason }),
        ipAddress: null,
      },
    });

    return { success: true, userId };
  }

  /** Suspend (deactivate) a user account */
  async suspendUser(userId: number, adminId: number, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_SUSPENDED',
        entityType: 'User',
        entityId: userId,
        previousValue: JSON.stringify({ isActive: true }),
        newValue: JSON.stringify({ isActive: false, reason }),
        ipAddress: null,
      },
    });

    return { success: true, userId };
  }

  /** Reactivate a suspended user */
  async reactivateUser(userId: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_REACTIVATED',
        entityType: 'User',
        entityId: userId,
        previousValue: JSON.stringify({ isActive: false }),
        newValue: JSON.stringify({ isActive: true }),
        ipAddress: null,
      },
    });

    return { success: true, userId };
  }

  /** Summary stats for the security dashboard */
  async securityStats() {
    const [activeLocks, totalLocks, recentFailed, flaggedUsers] =
      await Promise.all([
        this.prisma.accountLock.count({ where: { isActive: true } }),
        this.prisma.accountLock.count(),
        this.prisma.auditLog.count({
          where: {
            action: 'LOGIN_FAIL',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.user.count({ where: { flaggedForReview: true } }),
      ]);

    const locksByReason = await this.prisma.accountLock.groupBy({
      by: ['reason'],
      _count: { id: true },
      where: { isActive: true },
    });

    return {
      activeLocks,
      totalLocks,
      recentFailedLogins24h: recentFailed,
      flaggedUsers,
      locksByReason: locksByReason.map((r) => ({
        reason: r.reason,
        count: r._count.id,
      })),
    };
  }
}
