import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { CodeController } from './controllers/code.controller';
import { CodeService } from './services/code.service';

/**
 * Module for code formatting and highlighting
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
