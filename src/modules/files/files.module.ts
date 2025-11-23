import { Module } from '@nestjs/common';

import { FilesController } from './controllers/files.controller';
import { FilesService } from './services/files.service';

/**
 * Module for general file conversion functionality.
 * Handles file format conversion for various document types.
 */
@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
