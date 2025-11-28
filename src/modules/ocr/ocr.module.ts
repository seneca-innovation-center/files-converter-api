import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { OcrController } from './controllers/ocr.controller';
import { OcrService } from './services/ocr.service';

/**
 * Module for OCR text extraction
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
