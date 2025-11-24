import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OcrController } from './controllers/ocr.controller';
import { OcrService } from './services/ocr.service';

/**
 * Module for OCR text extraction
 */
@Module({
  imports: [ConfigModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
