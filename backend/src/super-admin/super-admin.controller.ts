import {
  Controller, Get, Patch, Post, Delete, Param, Body,
  ParseIntPipe, UseGuards, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
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

  /** GET /super-admin/analytics/mrr — MRR + signups trend */
  @Get('analytics/mrr')
  mrrAnalytics() {
    return this.service.mrrAnalytics();
  }

  /** GET /super-admin/announcements */
  @Get('announcements')
  getAnnouncements() {
    return this.service.getAnnouncements();
  }

  /** POST /super-admin/announcements */
  @Post('announcements')
  createAnnouncement(@Body() body: { title: string; body: string; severity?: string; targetPlan?: string; expiresAt?: string }) {
    return this.service.createAnnouncement(body);
  }

  /** PATCH /super-admin/announcements/:id */
  @Patch('announcements/:id')
  updateAnnouncement(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; body?: string; severity?: string; targetPlan?: string; isActive?: boolean; expiresAt?: string },
  ) {
    return this.service.updateAnnouncement(id, body);
  }

  /** DELETE /super-admin/announcements/:id */
  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteAnnouncement(id);
  }

  // ─── Account Lock Management ─────────────────────────────────────────────────

  /** GET /super-admin/security/stats — security dashboard stats */
  @Get('security/stats')
  securityStats() {
    return this.service.securityStats();
  }

  /** GET /super-admin/security/locks — list active/all account locks */
  @Get('security/locks')
  getAccountLocks(
    @Query('activeOnly') activeOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAccountLocks(
      activeOnly !== 'false',
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 50,
    );
  }

  /** GET /super-admin/security/locks/:id — lock detail with audit trail */
  @Get('security/locks/:id')
  getAccountLock(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAccountLock(id);
  }

  /** POST /super-admin/security/locks/:id/unlock — admin unlocks a locked account */
  @Post('security/locks/:id/unlock')
  unlockAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string | undefined,
    @Req() req: Request & { user: any },
  ) {
    return this.service.unlockAccount(id, req.user.id, notes);
  }

  /** POST /super-admin/security/lock — admin manually locks an account */
  @Post('security/lock')
  adminLockAccount(
    @Body() body: { username: string; reason: string; notes?: string; lockedUntil?: string },
    @Req() req: Request & { user: any },
  ) {
    return this.service.adminLockAccount({ ...body, adminId: req.user.id });
  }

  /** POST /super-admin/security/users/:id/force-password-reset */
  @Post('security/users/:id/force-password-reset')
  forcePasswordReset(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.service.forcePasswordReset(id, req.user.id);
  }

  /** POST /super-admin/security/users/:id/flag */
  @Post('security/users/:id/flag')
  flagAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req: Request & { user: any },
  ) {
    return this.service.flagAccount(id, req.user.id, reason);
  }

  /** POST /super-admin/security/users/:id/suspend */
  @Post('security/users/:id/suspend')
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req: Request & { user: any },
  ) {
    return this.service.suspendUser(id, req.user.id, reason);
  }

  /** POST /super-admin/security/users/:id/reactivate */
  @Post('security/users/:id/reactivate')
  reactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: any },
  ) {
    return this.service.reactivateUser(id, req.user.id);
  }
}
