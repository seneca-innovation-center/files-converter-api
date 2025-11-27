import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

import { UserRole } from '../models/user.schema';

export class CreateUserDto {
  @IsString()
  authId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['super-admin', 'admin', 'user'])
  role?: UserRole;
}
