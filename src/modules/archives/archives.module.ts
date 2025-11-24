import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ArchivesController } from './controllers/archives.controller';
import { ArchivesService } from './services/archives.service';

/**
 * Module for archive creation and extraction
 */
@Module({
  imports: [ConfigModule],
  controllers: [ArchivesController],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
