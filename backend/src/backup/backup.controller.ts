import { Controller, Get, Post, UseInterceptors, UploadedFile, Res, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request as Req } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @Roles('Admin')
  async exportBackup(
    @Res() res: Response,
    @Request() req: Req,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    const { data, filename } = await this.backupService.exportBackup(actorId, ip, tenantId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Sensitive-Data', 'true');
    res.send(JSON.stringify(data, null, 2));
  }

  @Post('restore')
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('backup'))
  async restoreBackup(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: Req,
    @CurrentUser('id') actorId: number,
    @CurrentUser('tenantId') tenantId: number,
  ) {
    if (!file) throw new BadRequestException('No backup file provided');
    // Validate MIME type
    const allowedMime = ['application/json', 'text/plain', 'application/octet-stream'];
    if (!allowedMime.includes(file.mimetype) && !file.originalname.endsWith('.json')) {
      throw new BadRequestException('Invalid file type — JSON backup files only');
    }
    // Validate size (belt-and-suspenders alongside MulterModule limit)
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('File too large — maximum 20 MB');
    }
    // Parse and validate JSON structure
    let data: any;
    try {
      data = JSON.parse(file.buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid JSON — file could not be parsed');
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    return this.backupService.restoreBackup(data, actorId, ip, tenantId);
  }

  @Get('status')
  @Roles('Admin', 'Manager')
  async getBackupStatus(@CurrentUser('tenantId') tenantId: number) {
    return this.backupService.getStatus(tenantId);
  }
}
