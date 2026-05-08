import { IsString, MinLength, MaxLength, IsOptional, IsInt, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(50, { message: 'Username too long' })
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128, { message: 'Password too long' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsInt()
  roleId: number;
}
