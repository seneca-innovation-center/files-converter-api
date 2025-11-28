import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import { UserRole } from '../models/user.schema';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['super-admin', 'admin', 'user'])
  role: UserRole;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions?: string[];
}
