import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { PresentationsController } from './controllers/presentations.controller';
import { PresentationsService } from './services/presentations.service';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [PresentationsService],
  controllers: [PresentationsController],
})
export class PresentationsModule {}
