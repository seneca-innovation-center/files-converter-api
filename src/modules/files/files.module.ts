import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { FilesController } from './controllers/files.controller';
import { FilesService } from './services/files.service';

/**
 * Module for general file conversion functionality.
 * Handles file format conversion for various document types.
 */
@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
