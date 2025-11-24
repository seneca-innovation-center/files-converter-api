import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QrController } from './controllers/qr.controller';
import { QrService } from './services/qr.service';

/**
 * Module for QR code and barcode generation
 */
@Module({
  imports: [ConfigModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
