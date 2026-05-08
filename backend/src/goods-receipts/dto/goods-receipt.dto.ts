import { IsOptional, IsInt, IsArray, ValidateNested, IsNumber, IsDateString, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GoodsReceiptLineDto {
  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  batchNo?: string;
}

export class CreateGoodsReceiptDto {
  @IsOptional()
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  locationId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}

export class CreateSupplierInvoiceDto {
  @IsInt()
  goodsReceiptId: number;

  @IsString()
  invoiceNumber: string;

  @IsDateString()
  invoiceDate: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}
