import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';
import libre from 'libreoffice-convert';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';

import {
  ConvertPresentationDto,
  PresentationTargetFormat,
} from '../dtos/convert-presentation.dto';
import { CreatePresentationDto } from '../dtos/create-presentation.dto';

/**
 * Service for handling presentation operations
 */
@Injectable()
export class PresentationsService {
  private readonly logger = new Logger(PresentationsService.name);
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Creates a PPTX presentation from structured data
   */
  async createPresentation(
    dto: CreatePresentationDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      this.logger.log(`Creating presentation: ${dto.title}`);

      const pptx = new PptxGenJS();
      pptx.author = 'Files Converter API';
      pptx.company = 'Converter API';
      pptx.title = dto.title;

      // Add slides
      for (const slideData of dto.slides) {
        const slide = pptx.addSlide();

        // Add title
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 44,
          bold: true,
          color: '363636',
        });

        // Add content or bullets
        if (slideData.bullets && slideData.bullets.length > 0) {
          // Add bullets one by one
          slideData.bullets.forEach((bullet, index) => {
            slide.addText(bullet, {
              x: 0.5,
              y: 1.8 + index * 0.5,
              w: 9,
              h: 0.4,
              fontSize: 18,
              bullet: true,
              color: '000000',
            });
          });
        } else if (slideData.content) {
          slide.addText(slideData.content, {
            x: 0.5,
            y: 1.8,
            w: 9,
            h: 4.5,
            fontSize: 18,
            color: '000000',
          });
        }
      }

      // Generate file
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `presentation_${timestamp}_${randomString}.pptx`;
      const filePath = join(this.tmpDir, filename);

      await pptx.writeFile({ fileName: filePath });

      return {
        filePath,
        filename,
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Presentation creation failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Converts PPTX to PDF or images using LibreOffice
   */
  async convertPresentation(
    fileBuffer: Buffer,
    dto: ConvertPresentationDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      this.logger.log(`Converting presentation to ${dto.targetFormat}`);

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const inputPath = join(
        this.tmpDir,
        `input_${timestamp}_${randomString}.pptx`,
      );

      // Write input file
      await fs.writeFile(inputPath, fileBuffer);

      if (dto.targetFormat === PresentationTargetFormat.PDF) {
        // Convert to PDF using libreoffice-convert
        const convertAsync = promisify(libre.convert);
        const pdfBuffer = await convertAsync(fileBuffer, '.pdf', undefined);

        const filename = `converted_${timestamp}_${randomString}.pdf`;
        const filePath = join(this.tmpDir, filename);
        await fs.writeFile(filePath, pdfBuffer);

        // Clean up input file
        await this.deleteFile(inputPath);

        return {
          filePath,
          filename,
          mimeType: 'application/pdf',
        };
      } else if (
        dto.targetFormat === PresentationTargetFormat.PNG ||
        dto.targetFormat === PresentationTargetFormat.JPEG
      ) {
        // Convert to PDF first, then extract images from each page
        const convertAsync = promisify(libre.convert);
        const pdfBuffer = await convertAsync(fileBuffer, '.pdf', undefined);

        // Use sharp to convert PDF pages to images
        const pdfPath = join(
          this.tmpDir,
          `temp_${timestamp}_${randomString}.pdf`,
        );
        await fs.writeFile(pdfPath, pdfBuffer);

        // Get PDF metadata to determine number of pages
        const pdfMetadata = await sharp(pdfBuffer, { pages: -1 }).metadata();
        const pageCount = pdfMetadata.pages || 1;

        // If single page or first page only, convert to single image
        // For multiple pages, we'll create a zip file with all images
        const imageBuffers: Buffer[] = [];
        const format =
          dto.targetFormat === PresentationTargetFormat.JPEG ? 'jpeg' : 'png';

        for (let page = 1; page <= pageCount; page++) {
          const imageBuffer = await sharp(pdfBuffer, { page: page - 1 })
            .toFormat(format, { quality: 90 })
            .toBuffer();
          imageBuffers.push(imageBuffer);
        }

        // Clean up temp PDF
        await this.deleteFile(pdfPath);
        await this.deleteFile(inputPath);

        if (pageCount === 1) {
          // Single image output
          const filename = `converted_${timestamp}_${randomString}.${format}`;
          const filePath = join(this.tmpDir, filename);
          await fs.writeFile(filePath, imageBuffers[0]);

          return {
            filePath,
            filename,
            mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
          };
        } else {
          // Multiple images - create a zip file
          const zipFilename = `converted_${timestamp}_${randomString}.zip`;
          const zipFilePath = join(this.tmpDir, zipFilename);

          await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err: Error) => reject(err));

            archive.pipe(output);

            imageBuffers.forEach((buffer, index) => {
              archive.append(buffer, {
                name: `slide_${index + 1}.${format}`,
              });
            });

            void archive.finalize();
          });

          return {
            filePath: zipFilePath,
            filename: zipFilename,
            mimeType: 'application/zip',
          };
        }
      } else {
        await this.deleteFile(inputPath);
        throw new BadRequestException(
          `Unsupported target format: ${String(dto.targetFormat)}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'PPTX conversion failed: ' + (error as Error).message,
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
