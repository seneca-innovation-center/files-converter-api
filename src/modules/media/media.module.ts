import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { MediaController } from './controllers/media.controller';
import { MediaService } from './services/media.service';

/**
 * Module for video and audio conversion
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
