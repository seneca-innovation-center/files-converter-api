import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { EbooksController } from './controllers/ebooks.controller';
import { EbooksService } from './services/ebooks.service';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [EbooksService],
  controllers: [EbooksController],
})
export class EbooksModule {}
