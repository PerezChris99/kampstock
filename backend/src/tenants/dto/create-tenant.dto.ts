import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsIn } from 'class-validator';

export class CreateTenantDto {
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @IsString() @MinLength(2) @MaxLength(30)
  subdomain: string;

  @IsString() @MinLength(8)
  adminPassword: string;

  @IsString() @MinLength(2)
  adminName: string;

  @IsString() @MinLength(3)
  adminUsername: string;

  @IsOptional() @IsEmail()
  ownerEmail?: string;

  @IsOptional() @IsString()
  ownerPhone?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsIn(['starter', 'professional', 'enterprise'])
  plan?: string;
}
