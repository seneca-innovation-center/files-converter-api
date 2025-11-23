import { Module } from '@nestjs/common';

import { ImagesController } from './controllers/images.controller';
import { ImagesService } from './services/images.service';

/**
 * Module for image conversion functionality.
 * Handles image format conversion, resizing, and AI background removal.
 */
@Module({
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
