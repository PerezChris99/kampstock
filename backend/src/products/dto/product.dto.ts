import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SafeText } from '../../common/decorators/safe-text.decorator';

export class CreateProductUnitDto {
  @IsString()
  unitName: string;

  @IsNumber()
  @Min(0)
  conversionFactor: number;

  @IsNumber()
  @Min(0)
  buyingPrice: number;

  @IsNumber()
  @Min(0)
  sellingPriceRetail: number;

  @IsNumber()
  @Min(0)
  sellingPriceWholesale: number;

  @IsOptional()
  @IsNumber()
  minWholesaleQty?: number;
}

export class CreateProductDto {
  @SafeText()
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsBoolean()
  allowFractional?: boolean;

  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  @IsOptional()
  @IsNumber()
  defaultTaxRate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductUnitDto)
  units: CreateProductUnitDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  @IsOptional()
  @IsNumber()
  defaultTaxRate?: number;
}
