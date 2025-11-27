import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { MarkdownController } from './controllers/markdown.controller';
import { MarkdownService } from './services/markdown.service';

/**
 * Module for markdown conversion
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [MarkdownController],
  providers: [MarkdownService],
  exports: [MarkdownService],
})
export class MarkdownModule {}
