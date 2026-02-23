import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './controllers/health.controller';
import { SystemHealthIndicator } from './indicators/system-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [SystemHealthIndicator],
})
export class HealthModule {}
