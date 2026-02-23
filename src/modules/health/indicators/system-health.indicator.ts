import { exec } from 'child_process';
import { promisify } from 'util';

import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

const execAsync = promisify(exec);

@Injectable()
export class SystemHealthIndicator extends HealthIndicator {
  async checkFfmpeg(): Promise<HealthIndicatorResult> {
    try {
      const { stdout } = await execAsync('ffmpeg -version', { timeout: 5000 });
      const version = stdout.split('\n')[0].trim();
      return this.getStatus('ffmpeg', true, { version });
    } catch (error) {
      throw new HealthCheckError(
        'FFmpeg check failed',
        this.getStatus('ffmpeg', false, {
          message: (error as Error).message,
        }),
      );
    }
  }

  async checkLibreOffice(): Promise<HealthIndicatorResult> {
    try {
      const { stdout } = await execAsync('soffice --version', {
        timeout: 10000,
      });
      return this.getStatus('libreoffice', true, {
        version: stdout.trim(),
      });
    } catch (error) {
      throw new HealthCheckError(
        'LibreOffice check failed',
        this.getStatus('libreoffice', false, {
          message: (error as Error).message,
        }),
      );
    }
  }

  async checkSharp(): Promise<HealthIndicatorResult> {
    try {
      const sharp = await import('sharp');
      const versions = sharp.default.versions;
      return this.getStatus('sharp_libvips', true, { versions });
    } catch (error) {
      throw new HealthCheckError(
        'Sharp/libvips check failed',
        this.getStatus('sharp_libvips', false, {
          message: (error as Error).message,
        }),
      );
    }
  }
}
