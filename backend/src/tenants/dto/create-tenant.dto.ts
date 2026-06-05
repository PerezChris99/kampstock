import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  subdomain: string;

  @IsString()
  @MinLength(10, { message: 'Admin password must be at least 10 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$/, {
    message:
      'Admin password must contain uppercase, lowercase, a number, and a special character',
  })
  adminPassword: string;

  @IsString()
  @MinLength(2)
  adminName: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, dashes, or underscores',
  })
  adminUsername: string;

  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn([
    'retail',
    'wholesale',
    'pharmacy',
    'restaurant',
    'electronics',
    'hardware',
    'clothing',
    'supermarket',
    'agriculture',
    'other',
  ])
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan?: string;
}
