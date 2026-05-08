import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new business tenant.
   * Creates: Tenant record + 4 default roles + 1 admin user.
   */
  async register(dto: CreateTenantDto) {
    const subdomainConflict = await this.prisma.tenant.findUnique({ where: { subdomain: dto.subdomain } });
    if (subdomainConflict) throw new ConflictException('Subdomain already taken');

    const nameConflict = await this.prisma.tenant.findUnique({ where: { name: dto.name } });
    if (nameConflict) throw new ConflictException('Business name already registered');

    const usernameConflict = await this.prisma.user.findUnique({ where: { username: dto.adminUsername } });
    if (usernameConflict) throw new ConflictException('Admin username already taken — choose another');

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        subdomain: dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        ownerEmail: dto.ownerEmail,
        ownerPhone: dto.ownerPhone,
        address: dto.address,
        plan: dto.plan ?? 'starter',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
      },
    });

    // Create default roles for this tenant
    const [adminRole] = await Promise.all([
      this.prisma.role.create({ data: { name: `Admin_${tenant.id}`, permissions: JSON.stringify({ all: true }), tenantId: tenant.id } }),
      this.prisma.role.create({ data: { name: `Manager_${tenant.id}`, permissions: JSON.stringify({ manage_products: true, manage_sales: true, view_reports: true, manage_stock: true }), tenantId: tenant.id } }),
      this.prisma.role.create({ data: { name: `Cashier_${tenant.id}`, permissions: JSON.stringify({ create_sales: true }), tenantId: tenant.id } }),
      this.prisma.role.create({ data: { name: `Storekeeper_${tenant.id}`, permissions: JSON.stringify({ manage_stock: true }), tenantId: tenant.id } }),
    ]);

    // Create default stock location
    await this.prisma.stockLocation.create({
      data: { name: 'Main Store', description: 'Primary stock location', tenantId: tenant.id },
    });

    // Create admin user
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const admin = await this.prisma.user.create({
      data: {
        name: dto.adminName,
        username: dto.adminUsername,
        passwordHash,
        roleId: adminRole.id,
        tenantId: tenant.id,
      },
      include: { role: true },
    });

    const { passwordHash: _, ...adminSafe } = admin;
    return {
      tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain, plan: tenant.plan, trialEndsAt: tenant.trialEndsAt },
      admin: adminSafe,
      message: `Tenant "${tenant.name}" registered successfully. Login at /${tenant.subdomain} with username "${dto.adminUsername}".`,
    };
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      select: { id: true, name: true, subdomain: true, plan: true, isActive: true, trialEndsAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, subdomain: true, plan: true, isActive: true, ownerEmail: true, ownerPhone: true, address: true, trialEndsAt: true, createdAt: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async toggleActive(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({ where: { id }, data: { isActive: !tenant.isActive } });
  }

  /** Stats for a tenant: users, products, sales count */
  async stats(tenantId: number) {
    const [users, products, salesCount, totalRevenue] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.sale.count({ where: { tenantId } }),
      this.prisma.sale.aggregate({ where: { tenantId, status: 'COMPLETED' }, _sum: { grandTotal: true } }),
    ]);
    return { users, products, salesCount, totalRevenue: totalRevenue._sum.grandTotal ?? 0 };
  }
}
