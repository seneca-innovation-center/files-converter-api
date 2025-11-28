import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ImagesController } from './controllers/images.controller';
import { ImagesService } from './services/images.service';

/**
 * Module for image conversion functionality.
 * Handles image format conversion, resizing, and AI background removal.
 */
@Module({
  imports: [AuthModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
