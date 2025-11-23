import { promises as fs } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Service for cleaning up temporary files older than 15 minutes.
 * Runs automatically every 15 minutes using NestJS scheduler.
 */
@Injectable()
export class TempFileCleanupService {
  private readonly logger = new Logger(TempFileCleanupService.name);
  private readonly tmpDir: string;
  private readonly maxAgeMinutes = 15;

  /**
   * Creates an instance of TempFileCleanupService.
   */
  constructor() {
    // Use /tmp directory for temporary files
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Cleans up temporary files older than the specified maximum age.
   * This method runs automatically every 15 minutes via cron job.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupOldFiles(): Promise<void> {
    try {
      this.logger.log('Starting temporary file cleanup...');

      const files = await fs.readdir(this.tmpDir);
      const now = Date.now();
      const maxAgeMs = this.maxAgeMinutes * 60 * 1000;
      let deletedCount = 0;
      let errorCount = 0;

      // Filter for files that match our naming pattern (converted_*)
      const convertedFiles = files.filter((file) =>
        file.startsWith('converted_'),
      );

      for (const file of convertedFiles) {
        try {
          const filePath = join(this.tmpDir, file);
          const stats = await stat(filePath);

          // Check if file is older than maxAgeMinutes
          const fileAge = now - stats.mtimeMs;
          if (fileAge > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
            this.logger.debug(`Deleted old file: ${file}`);
          }
        } catch (error) {
          errorCount++;
          const errorMessage = (error as Error).message;
          // Ignore ENOENT errors (file doesn't exist)
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            this.logger.warn(`Error cleaning up file ${file}: ${errorMessage}`);
          }
        }
      }

      this.logger.log(
        `Cleanup completed. Deleted: ${deletedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup temporary files: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Manually triggers cleanup of old temporary files.
   * Useful for testing or manual cleanup operations.
   */
  async manualCleanup(): Promise<{ deleted: number; errors: number }> {
    const now = Date.now();
    const maxAgeMs = this.maxAgeMinutes * 60 * 1000;
    let deletedCount = 0;
    let errorCount = 0;

    try {
      const files = await fs.readdir(this.tmpDir);
      const convertedFiles = files.filter((file) =>
        file.startsWith('converted_'),
      );

      for (const file of convertedFiles) {
        try {
          const filePath = join(this.tmpDir, file);
          const stats = await stat(filePath);

          const fileAge = now - stats.mtimeMs;
          if (fileAge > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          errorCount++;
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Manual cleanup failed: ${(error as Error).message}`);
      throw error;
    }

    return { deleted: deletedCount, errors: errorCount };
  }
}
