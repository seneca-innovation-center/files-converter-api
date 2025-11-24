/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { promises as fs } from 'fs';
import { createWriteStream, createReadStream } from 'fs';
import { join } from 'path';
import { createGunzip, createGzip } from 'zlib';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';
import * as tar from 'tar-stream';
import * as unzipper from 'unzipper';

import { CreateArchiveDto, ArchiveFormat } from '../dtos/create-archive.dto';

/**
 * Service for archive creation and extraction
 */
@Injectable()
export class ArchivesService {
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Creates an archive from uploaded files
   * @param files Array of file buffers with filenames
   * @param dto Archive creation parameters
   * @returns Object containing the path to the archive
   */
  async createArchive(
    files: Array<{ buffer: Buffer; filename: string }>,
    dto: CreateArchiveDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files provided for archiving');
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension =
        dto.format === ArchiveFormat.TAR_GZ ? 'tar.gz' : dto.format;
      const filename = `archive_${timestamp}_${randomString}.${extension}`;
      const filePath = join(this.tmpDir, filename);

      if (dto.format === ArchiveFormat.ZIP) {
        await this.createZipArchive(files, filePath, dto.compressionLevel);
      } else if (dto.format === ArchiveFormat.TAR) {
        await this.createTarArchive(files, filePath, false);
      } else if (dto.format === ArchiveFormat.TAR_GZ) {
        await this.createTarArchive(files, filePath, true);
      }

      const mimeTypes = {
        [ArchiveFormat.ZIP]: 'application/zip',
        [ArchiveFormat.TAR]: 'application/x-tar',
        [ArchiveFormat.TAR_GZ]: 'application/gzip',
      };

      return {
        filePath,
        filename,
        mimeType: mimeTypes[dto.format],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Archive creation failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Extracts files from an archive
   * @param buffer Archive file buffer
   * @param originalFilename Original filename for format detection
   * @returns Array of extracted files
   */
  async extractArchive(
    buffer: Buffer,
    originalFilename: string,
  ): Promise<Array<{ filename: string; buffer: Buffer }>> {
    try {
      const extension = originalFilename.split('.').pop()?.toLowerCase();

      if (extension === 'zip') {
        return await this.extractZip(buffer);
      } else if (extension === 'tar' || originalFilename.endsWith('.tar.gz')) {
        return await this.extractTar(buffer, originalFilename.endsWith('.gz'));
      }

      throw new BadRequestException(`Unsupported archive format: ${extension}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Archive extraction failed: ' + (error as Error).message,
      );
    }
  }

  private async createZipArchive(
    files: Array<{ buffer: Buffer; filename: string }>,
    outputPath: string,
    compressionLevel?: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: compressionLevel || 6 },
      });

      output.on('close', () => resolve());
      archive.on('error', reject);

      archive.pipe(output);

      for (const file of files) {
        archive.append(file.buffer, { name: file.filename });
      }

      void archive.finalize();
    });
  }

  private async createTarArchive(
    files: Array<{ buffer: Buffer; filename: string }>,
    outputPath: string,
    compress: boolean,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const pack = tar.pack();

      if (compress) {
        const gzip = createGzip();
        pack.pipe(gzip).pipe(output);
      } else {
        pack.pipe(output);
      }

      output.on('close', () => resolve());
      pack.on('error', reject);

      for (const file of files) {
        pack.entry(
          { name: file.filename, size: file.buffer.length },
          file.buffer,
        );
      }

      pack.finalize();
    });
  }

  private async extractZip(
    buffer: Buffer,
  ): Promise<Array<{ filename: string; buffer: Buffer }>> {
    return new Promise(async (resolve, reject) => {
      try {
        const tempFile = join(this.tmpDir, `temp_${Date.now()}.zip`);
        await fs.writeFile(tempFile, buffer);

        const files: Array<{ filename: string; buffer: Buffer }> = [];
        const stream = createReadStream(tempFile);

        stream
          .pipe(unzipper.Parse())
          .on('entry', async (entry: unzipper.Entry) => {
            if (entry.type === 'File') {
              const chunks: Buffer[] = [];
              entry.on('data', (chunk: Buffer) => chunks.push(chunk));
              entry.on('end', () => {
                files.push({
                  filename: entry.path,
                  buffer: Buffer.concat(chunks),
                });
              });
            } else {
              entry.autodrain();
            }
          })
          .on('close', async () => {
            await fs.unlink(tempFile);
            resolve(files);
          })
          .on('error', reject);
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  private async extractTar(
    buffer: Buffer,
    compressed: boolean,
  ): Promise<Array<{ filename: string; buffer: Buffer }>> {
    return new Promise(async (resolve, reject) => {
      try {
        const files: Array<{ filename: string; buffer: Buffer }> = [];
        const extract = tar.extract();

        extract.on('entry', (header, stream, next) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            if (header.type === 'file') {
              files.push({
                filename: header.name,
                buffer: Buffer.concat(chunks),
              });
            }
            next();
          });
          stream.resume();
        });

        extract.on('finish', () => resolve(files));
        extract.on('error', reject);

        if (compressed) {
          const gunzip = createGunzip();
          gunzip.pipe(extract);
          gunzip.write(buffer);
          gunzip.end();
        } else {
          extract.write(buffer);
          extract.end();
        }
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
