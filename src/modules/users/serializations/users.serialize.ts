import { Expose, Transform } from 'class-transformer';

import { UserRole } from '../models/user.schema';

export function TransformMongoId(options?: { toPlainOnly?: boolean }) {
  return (target: UsersSerialize, propertyKey: string): void => {
    Transform((params) => params.obj[propertyKey]?.toString(), options)(
      target,
      propertyKey,
    );
  };
}

export class UsersSerialize {
  @Expose()
  @TransformMongoId()
  _id: string;

  @Expose()
  authId: string;

  @Expose()
  email: string;

  @Expose()
  fullName?: string;

  @Expose()
  role: UserRole;

  @Expose()
  permissions: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UsersSerialize>) {
    Object.assign(this, partial);
  }
}
