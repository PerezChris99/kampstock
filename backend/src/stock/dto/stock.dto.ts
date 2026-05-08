import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
enum MovementType { PURCHASE = 'PURCHASE', SALE = 'SALE', TRANSFER = 'TRANSFER', ADJUSTMENT = 'ADJUSTMENT', RETURN_IN = 'RETURN_IN', RETURN_OUT = 'RETURN_OUT', DAMAGE = 'DAMAGE', EXPIRY = 'EXPIRY' }

export class CreateStockLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class StockAdjustmentDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  locationId: number;

  @IsNumber()
  quantity: number;

  @IsEnum(MovementType)
  movementType: MovementType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class StockTransferDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  fromLocationId: number;

  @IsNumber()
  toLocationId: number;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
