import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PesapalService } from './pesapal.service';
import { randomUUID } from 'crypto';

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

      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'COMPLETED',
            paymentMethod: txStatus.paymentMethod,
            confirmedAt: now,
            expiresAt,
          },
        }),
        this.prisma.tenant.update({
          where: { id: sub.tenantId },
          data: { plan: sub.plan, planExpiresAt: expiresAt, isActive: true },
        }),
      ]);

      this.logger.log(`Subscription COMPLETED for tenant ${sub.tenantId} — plan ${sub.plan} until ${expiresAt.toISOString()}`);
      return { status: 'completed' };
    }

    if (normalized === 'failed' || normalized === 'invalid') {
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'FAILED' } });
      return { status: 'failed' };
    }

    return { status: 'pending' };
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
    const latestSub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'COMPLETED' },
      orderBy: { confirmedAt: 'desc' },
    });
    return { ...tenant, latestSub, prices: PLAN_PRICES };
  }
}
