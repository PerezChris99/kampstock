import {
  IsInt, IsOptional, IsString, IsEnum, IsNumber, IsArray,
  ValidateNested, Min, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
enum SaleType { RETAIL = 'RETAIL', WHOLESALE = 'WHOLESALE', CREDIT = 'CREDIT' }
enum PaymentMethod { CASH = 'CASH', MOBILE_MONEY = 'MOBILE_MONEY', BANK = 'BANK', CREDIT = 'CREDIT' }

export class CreateSaleLineDto {
  @IsInt()
  productId: number;

  @IsOptional()
  @IsInt()
  productUnitId?: number;

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

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class CreateSaleDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines: CreateSaleLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments: CreatePaymentDto[];
}

export class AddPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}
