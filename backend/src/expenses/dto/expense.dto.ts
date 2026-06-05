import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { SafeText } from '../../common/decorators/safe-text.decorator';

export class CreateExpenseDto {
  @SafeText()
  @IsString()
  category: string;

  @SafeText()
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

  // alias accepted from frontend (mapped to paidAt in service)
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
