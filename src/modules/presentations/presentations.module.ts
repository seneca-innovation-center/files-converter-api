import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PresentationsController } from './controllers/presentations.controller';
import { PresentationsService } from './services/presentations.service';

@Module({
  imports: [ConfigModule],
  providers: [PresentationsService],
  controllers: [PresentationsController],
})
export class PresentationsModule {}
