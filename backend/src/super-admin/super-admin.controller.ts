import {
  Controller, Get, Patch, Post, Param, Body,
  ParseIntPipe, UseGuards, Query, ParseIntPipe as PIP,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { UpdatePlanDto, PromoteUserDto } from './dto/super-admin.dto';

@Controller('super-admin')
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  /** GET /super-admin/dashboard — platform-wide stats */
  @Get('dashboard')
  dashboard() {
    return this.service.dashboardStats();
  }

  /** GET /super-admin/tenants — all tenants with per-tenant stats */
  @Get('tenants')
  allTenants() {
    return this.service.allTenants();
  }

  /** PATCH /super-admin/tenants/:id/toggle — suspend / reinstate */
  @Patch('tenants/:id/toggle')
  toggleTenant(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleTenant(id);
  }

  /** PATCH /super-admin/tenants/:id/plan — change plan */
  @Patch('tenants/:id/plan')
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.service.updatePlan(id, dto.plan);
  }

  /** POST /super-admin/promote — grant super-admin to a user */
  @Post('promote')
  promote(@Body() dto: PromoteUserDto) {
    return this.service.promoteToSuperAdmin(dto.username);
  }

  /** GET /super-admin/audit — platform-wide audit log */
  @Get('audit')
  auditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.auditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 50,
    );
  }
}
