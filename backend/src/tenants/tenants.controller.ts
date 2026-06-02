import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  /** Public: register a new business */
  @Public()
  @Post('register')
  register(@Body() dto: CreateTenantDto) {
    return this.service.register(dto);
  }

  /** Public: resolve tenant branding by subdomain (used by login page) */
  @Public()
  @Get('subdomain/:subdomain')
  findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.service.findBySubdomain(subdomain);
  }

  /** Super-admin only: list all tenants */
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Get(':id/stats')
  stats(@Param('id', ParseIntPipe) id: number) {
    return this.service.stats(id);
  }

  @UseGuards(RolesGuard)
  @Roles('Admin')
  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleActive(id);
  }

  /** Tenant owner updates their own business profile */
  @Patch('profile')
  updateProfile(
    @Body() dto: { ownerEmail?: string; ownerPhone?: string; address?: string; businessType?: string; description?: string },
    @CurrentUser('tenantId') tenantId: number,
  ) {
    return this.service.updateProfile(tenantId, dto);
  }

  /** GET /tenants/profile — current tenant profile */
  @Get('profile')
  getProfile(@CurrentUser('tenantId') tenantId: number) {
    return this.service.findOne(tenantId);
  }
}
