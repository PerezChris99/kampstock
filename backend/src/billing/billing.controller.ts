import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { IsIn, IsInt, IsOptional, Min, Max, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

class InitiateDto {
  @IsIn(['starter', 'professional', 'enterprise'])
  plan: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  periodMonths?: number;
}

class UnlockDto {
  @IsString()
  @Length(8, 64)
  code: string;
}

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  /** Initiate a Pesapal payment for plan upgrade */
  @Post('subscribe')
  initiate(@Body() dto: InitiateDto, @CurrentUser('tenantId') tenantId: number) {
    return this.billing.initiate(tenantId, dto.plan, dto.periodMonths ?? 1);
  }

  /** Pesapal IPN callback (GET — Pesapal uses GET by default) */
  @Public()
  @Get('ipn')
  @HttpCode(200)
  async ipn(
    @Query('orderTrackingId') orderTrackingId: string,
    @Query('orderMerchantReference') merchantReference: string,
  ) {
    await this.billing.handleIpn(orderTrackingId, merchantReference);
    return { orderNotificationType: 'IPNCHANGE', orderTrackingId, orderMerchantReference: merchantReference, status: '200' };
  }

  /** Current tenant billing info + subscription history */
  @Get('my')
  async my(@CurrentUser('tenantId') tenantId: number) {
    return this.billing.getTenantBillingInfo(tenantId);
  }

  /**
   * Verify an unlock code received after payment.
   * The code is single-use and generated only when Pesapal confirms a payment.
   * Accessible even when locked (bypass route in TenantLockMiddleware).
   */
  @Post('unlock')
  async unlock(@Body() dto: UnlockDto, @CurrentUser('tenantId') tenantId: number) {
    return this.billing.verifyUnlockCode(tenantId, dto.code);
  }
}

