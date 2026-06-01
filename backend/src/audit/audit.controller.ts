import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles('Admin', 'Manager')
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @CurrentUser('tenantId') tenantId?: number,
  ) {
    return this.auditService.findAll(entityType, entityId ? parseInt(entityId) : undefined, tenantId);
  }
}
