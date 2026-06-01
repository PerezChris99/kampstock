import { Module } from '@nestjs/common';
import { PesapalService } from './pesapal.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PesapalService, BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
