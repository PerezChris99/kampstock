import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';

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
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, dashes, or underscores',
  })
  username: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128, { message: 'Password too long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsInt()
  roleId: number;
}
