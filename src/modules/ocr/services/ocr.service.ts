import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWorker } from 'tesseract.js';

import { ExtractTextDto, OcrLanguage } from '../dtos/extract-text.dto';

/**
 * Service for OCR text extraction from images
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Extracts text from an image using OCR
   * @param fileBuffer Image file buffer
   * @param dto OCR parameters
   * @returns Object containing the extracted text and file path
   */
  async extractText(
    fileBuffer: Buffer,
    dto: ExtractTextDto,
  ): Promise<{
    filePath: string;
    filename: string;
    mimeType: string;
    text: string;
  }> {
    try {
      const language = dto.language || OcrLanguage.ENGLISH;
      this.logger.log(`OCR extraction, language: ${language}`);
      const outputFormat = dto.outputFormat || 'txt';

      // Create Tesseract worker
      const worker = await createWorker(language);

      // Perform OCR
      const { data } = await worker.recognize(fileBuffer);
      const extractedText = data.text;

      await worker.terminate();

      // Generate output file
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `ocr_${timestamp}_${randomString}.${outputFormat}`;
      const filePath = join(this.tmpDir, filename);

      let outputBuffer: Buffer;
      let mimeType: string;

      if (outputFormat === 'txt') {
        outputBuffer = Buffer.from(extractedText);
        mimeType = 'text/plain';
      } else if (outputFormat === 'json') {
        const jsonOutput = JSON.stringify(
          {
            text: extractedText,
            confidence: data.confidence,
          },
          null,
          2,
        );
        outputBuffer = Buffer.from(jsonOutput);
        mimeType = 'application/json';
      } else {
        // Default to txt
        outputBuffer = Buffer.from(extractedText);
        mimeType = 'text/plain';
      }

      await fs.writeFile(filePath, outputBuffer);

      return {
        filePath,
        filename,
        mimeType,
        text: extractedText,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'OCR text extraction failed: ' + (error as Error).message,
      );
    }
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
