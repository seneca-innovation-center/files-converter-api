import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ThreeDController } from './controllers/3d.controller';
import { ThreeDService } from './services/3d.service';

/**
 * Module for 3D model conversion functionality.
 * Handles 3D model format conversion and optimization.
 */
@Module({
  imports: [AuthModule],
  controllers: [ThreeDController],
  providers: [ThreeDService],
  exports: [ThreeDService],
})
export class ThreeDModule {}
