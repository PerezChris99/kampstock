import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PesapalService } from './pesapal.service';
import { randomUUID, randomBytes } from 'crypto';
import { bustLockCache } from '../common/middleware/tenant-lock.middleware';

export const PLAN_PRICES: Record<string, number> = {
  starter: 50_000,
  professional: 150_000,
  enterprise: 400_000,
};

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter Plan',
  professional: 'Professional Plan',
  enterprise: 'Enterprise Plan',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private pesapal: PesapalService,
    private config: ConfigService,
  ) {}

  async initiate(tenantId: number, plan: string, periodMonths = 1) {
    if (!PLAN_PRICES[plan]) throw new BadRequestException('Invalid plan: ' + plan);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const amount = PLAN_PRICES[plan] * periodMonths;
    const merchantRef = `KS-${tenantId}-${plan.toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const result = await this.pesapal.submitOrder({
      merchantRef,
      amount,
      currency: 'UGX',
      description: `${PLAN_NAMES[plan]} × ${periodMonths} month(s) — ${tenant.name}`,
      callbackUrl: `${frontendUrl}/billing/callback`,
      email: tenant.ownerEmail || undefined,
      phone: tenant.ownerPhone || undefined,
      firstName: tenant.name,
    });

    const ipnId = await this.pesapal.getOrRegisterIpn();

    await this.prisma.subscription.create({
      data: {
        tenantId,
        plan,
        amount,
        currency: 'UGX',
        periodMonths,
        status: 'PENDING',
        trackingId: result.orderTrackingId,
        merchantRef,
        ipnId,
      },
    });

    return {
      redirectUrl: result.redirectUrl,
      orderTrackingId: result.orderTrackingId,
      merchantRef,
      amount,
      plan,
    };
  }

  async handleIpn(orderTrackingId: string, merchantReference: string) {
    this.logger.log(`IPN received — trackingId: ${orderTrackingId}, ref: ${merchantReference}`);

    const sub = await this.prisma.subscription.findUnique({ where: { trackingId: orderTrackingId } });
    if (!sub) {
      this.logger.warn(`IPN for unknown trackingId: ${orderTrackingId}`);
      return { status: 'ignored' };
    }
    if (sub.merchantRef !== merchantReference) {
      this.logger.warn(`IPN merchant reference mismatch for trackingId ${orderTrackingId}`);
      return { status: 'ignored' };
    }
    if (sub.status === 'COMPLETED') return { status: 'already_processed' };

    let txStatus: Awaited<ReturnType<PesapalService['getTransactionStatus']>>;
    try {
      txStatus = await this.pesapal.getTransactionStatus(orderTrackingId);
    } catch (err) {
      this.logger.error('Failed to get tx status from Pesapal', err);
      return { status: 'error' };
    }

    const normalized = txStatus.status.toLowerCase();
    if (normalized === 'completed') {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + sub.periodMonths);

      // Generate a cryptographically secure unlock code (single-use, stored plaintext in DB)
      // The code is only ever created here — triggered by Pesapal payment confirmation
      const unlockCode = randomBytes(16).toString('hex'); // 32-char hex

      const completed = await this.prisma.$transaction(async (tx) => {
        // Claim the pending subscription atomically. Duplicate IPNs may arrive
        // concurrently; only one request is allowed to transition PENDING -> COMPLETED.
        const claimed = await tx.subscription.updateMany({
          where: { id: sub.id, status: 'PENDING' },
          data: {
            status: 'COMPLETED',
            paymentMethod: txStatus.paymentMethod,
            confirmedAt: now,
            expiresAt,
            unlockCode,
          },
        });

        if (claimed.count !== 1) return false;

        await tx.tenant.update({
          where: { id: sub.tenantId },
          data: { plan: sub.plan, planExpiresAt: expiresAt, isActive: true },
        });

        return true;
      });

      if (!completed) return { status: 'already_processed' };

      // Bust the in-memory lock cache so the tenant can access immediately after unlock
      bustLockCache(sub.tenantId);

      this.logger.log(`Subscription COMPLETED for tenant ${sub.tenantId} — plan ${sub.plan} until ${expiresAt.toISOString()}`);
      return { status: 'completed' };
    }

    if (normalized === 'failed' || normalized === 'invalid') {
      const failed = await this.prisma.subscription.updateMany({
        where: { id: sub.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return { status: failed.count === 1 ? 'failed' : 'already_processed' };
    }

    return { status: 'pending' };
  }

  async verifyUnlockCode(tenantId: number, code: string): Promise<{ success: boolean; planExpiresAt: Date | null }> {
    if (!code || code.length < 8) throw new BadRequestException('Invalid unlock code');

    // Find a COMPLETED subscription for this tenant with this exact unlock code
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'COMPLETED',
        unlockCode: code.trim().toLowerCase(),
      },
      orderBy: { confirmedAt: 'desc' },
    });

    if (!sub) throw new BadRequestException('Invalid or already-used unlock code');

    // Fetch current tenant planExpiresAt
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { planExpiresAt: true },
    });

    // Clear the unlock code (single-use) and bust cache
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { unlockCode: null },
    });
    bustLockCache(tenantId);

    return { success: true, planExpiresAt: tenant?.planExpiresAt ?? null };
  }

  async getByTenant(tenantId: number) {
    return this.prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantBillingInfo(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true, planExpiresAt: true, isActive: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const history = await this.prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const latestSub = history.find((s) => s.status === 'COMPLETED') ?? null;

    // Compute lock/warning status
    const now = new Date();
    let daysLeft: number | null = null;
    let isLocked = false;
    let warningActive = false;

    if (tenant.planExpiresAt) {
      const diffMs = tenant.planExpiresAt.getTime() - now.getTime();
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isLocked = daysLeft <= 0;
      warningActive = daysLeft > 0 && daysLeft <= 2;
    } else if (tenant.trialEndsAt) {
      const diffMs = tenant.trialEndsAt.getTime() - now.getTime();
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      warningActive = daysLeft > 0 && daysLeft <= 2;
    }

    return {
      ...tenant,
      latestSub,
      history,
      prices: PLAN_PRICES,
      daysLeft,
      isLocked,
      warningActive,
    };
  }
}
