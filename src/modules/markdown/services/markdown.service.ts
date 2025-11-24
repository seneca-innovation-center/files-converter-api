import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as htmlPdf from 'html-pdf-node';
import { marked } from 'marked';
import * as TurndownService from 'turndown';

import {
  ConvertMarkdownDto,
  MarkdownFormat,
} from '../dtos/convert-markdown.dto';

/**
 * Service for markdown conversion operations
 */
@Injectable()
export class MarkdownService {
  private readonly tmpDir: string;
  private readonly turndownService: any;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
    // Handle both CommonJS and ES module exports
    const TurndownConstructor =
      (TurndownService as any).default || TurndownService;
    this.turndownService = new TurndownConstructor();
  }

  /**
   * Converts markdown to target format
   * @param fileBuffer Markdown file buffer
   * @param dto Conversion parameters
   * @returns Object containing the path to the converted file
   */
  async convertMarkdown(
    fileBuffer: Buffer,
    dto: ConvertMarkdownDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const markdownText = fileBuffer.toString('utf-8');
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);

      let convertedBuffer: Buffer;
      let extension: string;
      let mimeType: string;

      if (dto.targetFormat === MarkdownFormat.HTML) {
        const html = await marked.parse(markdownText);
        convertedBuffer = Buffer.from(html);
        extension = 'html';
        mimeType = 'text/html';
      } else if (dto.targetFormat === MarkdownFormat.PDF) {
        const html = await marked.parse(markdownText);
        const styledHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
                h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                h2 { margin-top: 30px; }
                code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
                pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `;
        // html-pdf-node returns a Promise, but types might be incorrect

        const pdfPromise = htmlPdf.generatePdf(
          { content: styledHtml },
          { format: 'A4' },
        ) as any;

        convertedBuffer = await Promise.resolve(pdfPromise).then(
          (buffer) => buffer as Buffer,
        );
        extension = 'pdf';
        mimeType = 'application/pdf';
      } else {
        throw new BadRequestException(
          `Unsupported format: ${dto.targetFormat as string}`,
        );
      }

      const filename = `converted_${timestamp}_${randomString}.${extension}`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, convertedBuffer);

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
        'Markdown conversion failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Converts HTML to markdown
   * @param fileBuffer HTML file buffer
   * @returns Markdown buffer
   */
  async htmlToMarkdown(
    fileBuffer: Buffer,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const html = fileBuffer.toString('utf-8');
      const markdown = this.turndownService.turndown(html) as string;

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `converted_${timestamp}_${randomString}.md`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, markdown);

      return {
        filePath,
        filename,
        mimeType: 'text/markdown',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'HTML to Markdown conversion failed: ' + (error as Error).message,
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
