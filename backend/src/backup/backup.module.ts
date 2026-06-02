import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
