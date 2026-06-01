import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto, CreateProductUnitDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateProductDto, actorId: number, tenantId: number) {
    if (!dto.units || dto.units.length === 0) {
      throw new BadRequestException('Product must have at least one unit');
    }

    const skuExists = await this.prisma.product.findUnique({ where: { sku_tenantId: { sku: dto.sku, tenantId } } });
    if (skuExists) throw new ConflictException('SKU already exists');

    if (dto.barcode) {
      const barcodeExists = await this.prisma.product.findUnique({ where: { barcode_tenantId: { barcode: dto.barcode, tenantId } } });
      if (barcodeExists) throw new ConflictException('Barcode already exists');
    }

    const { units, ...productData } = dto;
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        tenantId,
        units: { create: units },
      },
      include: { units: true, category: true },
    });
    await this.audit.log(actorId, 'CREATE', 'Product', product.id, null, { name: product.name, sku: product.sku });
    return product;
  }

  async findAll(search?: string, categoryId?: number, tenantId?: number) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(tenantId && { tenantId }),
        ...(search && { name: { contains: search } }),
        ...(categoryId && { categoryId }),
      },
      include: { units: true, category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, tenantId?: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      include: { units: true, category: true, priceHistories: { orderBy: { changedAt: 'desc' }, take: 20 } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string, tenantId: number) {
    // Try barcode first, then fallback to SKU lookup
    let product = await this.prisma.product.findUnique({
      where: { barcode_tenantId: { barcode, tenantId } },
      include: { units: true, category: true },
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { sku_tenantId: { sku: barcode, tenantId } },
        include: { units: true, category: true },
      });
    }
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: number, dto: UpdateProductDto, actorId: number, tenantId: number) {
    const product = await this.findOne(id, tenantId);
    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    await this.audit.log(actorId, 'UPDATE', 'Product', id, product, dto);
    return updated;
  }

  async updateUnit(productId: number, unitId: number, dto: Partial<CreateProductUnitDto>, actorId: number) {
    const unit = await this.prisma.productUnit.findFirst({ where: { id: unitId, productId } });
    if (!unit) throw new NotFoundException('Product unit not found');

    const priceFields = ['buyingPrice', 'sellingPriceRetail', 'sellingPriceWholesale'];
    for (const field of priceFields) {
      if (dto[field] !== undefined && dto[field] !== Number(unit[field])) {
        await this.prisma.priceHistory.create({
          data: {
            productId,
            oldPrice: unit[field],
            newPrice: dto[field],
            priceType: field,
            changedById: actorId,
          },
        });
      }
    }

    const updated = await this.prisma.productUnit.update({ where: { id: unitId }, data: dto });
    await this.audit.log(actorId, 'UPDATE', 'ProductUnit', unitId, unit, dto);
    return updated;
  }

  async remove(id: number, actorId: number, tenantId: number) {
    const product = await this.findOne(id, tenantId);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    await this.audit.log(actorId, 'DELETE', 'Product', id, { name: product.name }, null);
    return { deleted: true };
  }
}
