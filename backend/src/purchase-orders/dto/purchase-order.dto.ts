import {
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsIn,
  Min,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Purchase order lifecycle:
 *   DRAFT → SENT → PARTIAL → RECEIVED
 *   DRAFT | SENT | PARTIAL → CANCELLED
 * RECEIVED and CANCELLED are terminal.
 */
export const PO_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIAL',
  'RECEIVED',
  'CANCELLED',
] as const;
export type POStatus = (typeof PO_STATUSES)[number];

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
  @Min(0)
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
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines: CreatePOLineDto[];
}

export class UpdatePOStatusDto {
  @IsString()
  @IsIn(PO_STATUSES)
  status: POStatus;
}
