import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EbooksController } from './controllers/ebooks.controller';
import { EbooksService } from './services/ebooks.service';

@Module({
  imports: [ConfigModule],
  providers: [EbooksService],
  controllers: [EbooksController],
})
export class EbooksModule {}
