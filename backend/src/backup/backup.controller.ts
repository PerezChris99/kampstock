import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @Roles('Admin')
  async exportBackup(@Res() res: Response) {
    const { data, filename } = await this.backupService.exportBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Post('restore')
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('backup'))
  async restoreBackup(@UploadedFile() file: Express.Multer.File) {
    const data = JSON.parse(file.buffer.toString());
    return this.backupService.restoreBackup(data);
  }

  @Get('status')
  @Roles('Admin', 'Manager')
  async getBackupStatus() {
    return this.backupService.getStatus();
  }
}
