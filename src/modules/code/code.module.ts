import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CodeController } from './controllers/code.controller';
import { CodeService } from './services/code.service';

/**
 * Module for code formatting and highlighting
 */
@Module({
  imports: [ConfigModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
