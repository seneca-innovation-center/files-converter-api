import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

import { UserDocument } from '../modules/users/models/user.schema';
import { UsersService } from '../modules/users/services/users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockModel: Record<string, jest.Mock>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    authId: 'auth_1',
    email: 'user@example.com',
    fullName: 'Test User',
    role: 'user',
    permissions: [],
    save: jest.fn(),
  };

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    service = new UsersService(mockModel as unknown as Model<UserDocument>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureUserFromAuth', () => {
    it('should create a new user when not found', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockModel.create.mockResolvedValue({ ...mockUser });

      const result = await service.ensureUserFromAuth({
        authId: 'auth_1',
        email: 'User@Example.com',
        fullName: 'Test User',
      });

      expect(mockModel.create).toHaveBeenCalledWith({
        authId: 'auth_1',
        email: 'user@example.com',
        fullName: 'Test User',
        role: 'user',
      });
      expect(result).toBeDefined();
    });

    it('should update existing user when email or name changed', async () => {
      const existingUser = {
        ...mockUser,
        email: 'old@example.com',
        save: jest.fn(),
      };
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      });

      await service.ensureUserFromAuth({
        authId: 'auth_1',
        email: 'User@Example.com',
        fullName: 'Test User',
      });

      expect(existingUser.email).toBe('user@example.com');
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('should not update when data is unchanged', async () => {
      const existingUser = {
        ...mockUser,
        save: jest.fn(),
      };
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      });

      await service.ensureUserFromAuth({
        authId: 'auth_1',
        email: 'user@example.com',
        fullName: 'Test User',
      });

      expect(existingUser.save).not.toHaveBeenCalled();
    });
  });

  describe('findByAuthId', () => {
    it('should return serialized user when found', async () => {
      mockModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ ...mockUser }) }),
      });

      const result = await service.findByAuthId('auth_1');
      expect(result).toBeDefined();
      expect(mockModel.findOne).toHaveBeenCalledWith({ authId: 'auth_1' });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(service.findByAuthId('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return serialized user by id', async () => {
      mockModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ ...mockUser }) }),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when id not found', async () => {
      mockModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    it('should update role and permissions', async () => {
      const user = { ...mockUser, save: jest.fn() };
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      await service.updateRole('507f1f77bcf86cd799439011', {
        role: 'admin',
        permissions: ['manage-users'],
      });

      expect(user.role).toBe('admin');
      expect(user.permissions).toEqual(['manage-users']);
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateRole('missing', { role: 'admin' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user by id', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.remove('507f1f77bcf86cd799439011'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
