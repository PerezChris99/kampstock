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

  async create(dto: CreateCategoryDto, actorId: number) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Category name already exists');

    const category = await this.prisma.category.create({ data: dto });
    await this.audit.log(actorId, 'CREATE', 'Category', category.id, null, dto);
    return category;
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: { children: true, parent: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true, products: { select: { id: true, name: true, sku: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(id: number, dto: UpdateCategoryDto, actorId: number) {
    const cat = await this.findOne(id);
    if (dto.name && dto.name !== cat.name) {
      const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Category name already exists');
    }
    const updated = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.log(actorId, 'UPDATE', 'Category', id, cat, dto);
    return updated;
  }

  async remove(id: number, actorId: number) {
    const cat = await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log(actorId, 'DELETE', 'Category', id, cat, null);
    return { deleted: true };
  }
}
