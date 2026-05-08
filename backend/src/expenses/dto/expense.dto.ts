import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paidTo?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
