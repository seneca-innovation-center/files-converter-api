import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';

import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';
import { User, UserDocument } from '../models/user.schema';
import { UsersSerialize } from '../serializations/users.serialize';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async ensureUserFromAuth(
    payload: Pick<CreateUserDto, 'authId' | 'email' | 'fullName'>,
  ): Promise<UsersSerialize> {
    const normalizedEmail = payload.email.toLowerCase();
    let user = await this.userModel.findOne({ authId: payload.authId }).exec();

    if (!user) {
      user = await this.userModel.create({
        authId: payload.authId,
        email: normalizedEmail,
        fullName: payload.fullName,
        role: 'user',
      });
    } else {
      const needsUpdate =
        user.email !== normalizedEmail || user.fullName !== payload.fullName;
      if (needsUpdate) {
        user.email = normalizedEmail;
        user.fullName = payload.fullName;
        await user.save();
      }
    }

    return this.serialize(user);
  }

  async findAll(): Promise<UsersSerialize[]> {
    const users = await this.userModel.find().sort({ createdAt: -1 }).lean();
    return plainToInstance(UsersSerialize, users, {
      excludeExtraneousValues: true,
    });
  }

  async findByAuthId(authId: string): Promise<UsersSerialize | null> {
    const user = await this.userModel.findOne({ authId }).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.serialize(user);
  }

  async findOne(id: string): Promise<UsersSerialize | null> {
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.serialize(user);
  }

  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
  ): Promise<UsersSerialize> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = dto.role;
    if (dto.permissions) {
      user.permissions = dto.permissions;
    }

    await user.save();
    return this.serialize(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Serialize the onboarding tour document
   * @param doc The document to serialize
   * @returns The serialized onboarding tour
   */
  private serialize(doc: UserDocument): UsersSerialize {
    return plainToInstance(UsersSerialize, doc, {
      excludeExtraneousValues: true,
    });
  }
}
