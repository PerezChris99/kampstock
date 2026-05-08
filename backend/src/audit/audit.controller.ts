import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles('Admin', 'Manager')
  findAll(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.auditService.findAll(entityType, entityId ? parseInt(entityId) : undefined);
  }
}
