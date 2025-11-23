import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConvertFileDto } from '../dtos/convert-file.dto';

/**
 * Service for handling general file conversion operations.
 * This is a placeholder service that can be extended with specific file conversion logic.
 */
@Injectable()
export class FilesService {
  private readonly tmpDir: string;

  /**
   * Creates an instance of FilesService.
   * @param configService Service for accessing configuration values
   */
  constructor(private readonly configService: ConfigService) {
    // Use /tmp directory for temporary files
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Converts a file to the specified format.
   * Note: This is a basic implementation. Extend this service with specific conversion logic
   * for different file types (PDF, DOCX, etc.) as needed.
   * @param fileBuffer The file buffer
   * @param originalFilename Original filename
   * @param dto Conversion parameters
   * @returns Object containing the path to the converted file and metadata
   */
  async convertFile(
    fileBuffer: Buffer,
    originalFilename: string,
    dto: ConvertFileDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      // Parse options if provided (reserved for future conversion logic)
      let _options: Record<string, any> = {};
      if (dto.options) {
        try {
          _options = JSON.parse(dto.options);
        } catch (error) {
          throw new BadRequestException(
            'Invalid options JSON format: ' + (error as Error).message,
          );
        }
      }

      // For now, this is a placeholder implementation
      // In a production system, you would add specific conversion logic here
      // based on the source and target formats
      const sourceExt = originalFilename.split('.').pop()?.toLowerCase();
      const targetExt = dto.targetFormat.toLowerCase();

      // Basic validation
      if (sourceExt === targetExt) {
        throw new BadRequestException('Source and target formats are the same');
      }

      // Generate output filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `converted_${timestamp}_${randomString}.${targetExt}`;
      const filePath = join(this.tmpDir, filename);

      // For demonstration, we'll just copy the file with new extension
      // In production, implement actual conversion logic here
      // Example: Use libraries like pdf-lib, mammoth, etc. for specific conversions
      await fs.writeFile(filePath, fileBuffer);

      // Determine MIME type based on extension
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ppt: 'application/vnd.ms-powerpoint',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        xml: 'application/xml',
        html: 'text/html',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
      };

      const mimeType = mimeTypes[targetExt] || 'application/octet-stream';

      return {
        filePath,
        filename,
        mimeType,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'File conversion failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Gets the file buffer from a file path.
   * @param filePath Path to the file
   * @returns File buffer
   */
  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Deletes a temporary file.
   * @param filePath Path to the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
