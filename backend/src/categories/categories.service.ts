import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateCategoryDto, actorId: number, tenantId: number) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId, tenantId }, select: { id: true } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    const existing = await this.prisma.category.findUnique({ where: { name_tenantId: { name: dto.name, tenantId } } });
    if (existing) throw new ConflictException('Category name already exists');

    const category = await this.prisma.category.create({ data: { ...dto, tenantId } });
    await this.audit.log(actorId, 'CREATE', 'Category', category.id, null, dto);
    return category;
  }

  async findAll(tenantId?: number) {
    return this.prisma.category.findMany({
      where: { ...(tenantId && { tenantId }) },
      include: { children: true, parent: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, tenantId?: number) {
    const cat = await this.prisma.category.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      include: { children: true, parent: true, products: { select: { id: true, name: true, sku: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(id: number, dto: UpdateCategoryDto, actorId: number, tenantId: number) {
    const cat = await this.findOne(id, tenantId);
    if (dto.parentId === id) throw new ConflictException('Category cannot be its own parent');
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId, tenantId }, select: { id: true } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    if (dto.name && dto.name !== cat.name) {
      const exists = await this.prisma.category.findUnique({ where: { name_tenantId: { name: dto.name, tenantId } } });
      if (exists) throw new ConflictException('Category name already exists');
    }
    const updated = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.log(actorId, 'UPDATE', 'Category', id, cat, dto);
    return updated;
  }

  async remove(id: number, actorId: number, tenantId: number) {
    const cat = await this.findOne(id, tenantId);
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log(actorId, 'DELETE', 'Category', id, cat, null);
    return { deleted: true };
  }
}
