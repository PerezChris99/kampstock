import { IsInt, IsOptional, IsDateString, IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePOLineDto {
  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class CreatePurchaseOrderDto {
  @IsInt()
  supplierId: number;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines: CreatePOLineDto[];
}

export class UpdatePOStatusDto {
  @IsString()
  status: string;
}
