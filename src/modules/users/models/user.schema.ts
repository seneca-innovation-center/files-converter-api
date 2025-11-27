import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserRole = 'super-admin' | 'admin' | 'user';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  authId: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  fullName?: string;

  @Prop({
    type: String,
    enum: ['super-admin', 'admin', 'user'],
    default: 'user',
  })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ authId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
