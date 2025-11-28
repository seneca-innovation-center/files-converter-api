import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { AdminGuard } from '../../auth/guards/admin.guard';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';
import { UsersSerialize } from '../serializations/users.serialize';
import { UsersService } from '../services/users.service';

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  async getMe(@Req() request: FastifyRequest): Promise<UsersSerialize> {
    const user = await this.usersService.findByAuthId(request.user.authId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @Get()
  async findAll(): Promise<UsersSerialize[]> {
    return this.usersService.findAll();
  }

  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update user role (Super Admin only)' })
  @Patch(':id')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UsersSerialize> {
    return this.usersService.updateRole(id, dto);
  }

  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ): Promise<{ status: boolean; message: string }> {
    await this.usersService.remove(id);
    return { status: true, message: 'User deleted successfully' };
  }
}
