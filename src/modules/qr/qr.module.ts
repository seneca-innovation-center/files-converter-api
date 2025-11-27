import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { QrController } from './controllers/qr.controller';
import { QrService } from './services/qr.service';

/**
 * Module for QR code and barcode generation
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
