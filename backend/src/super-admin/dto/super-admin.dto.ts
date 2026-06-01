import { IsString, MinLength, IsIn } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan: string;
}

export class PromoteUserDto {
  @IsString()
  @MinLength(1)
  username: string;
}
