import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MulterModule.register({ limits: { fileSize: 100 * 1024 * 1024 } })],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
