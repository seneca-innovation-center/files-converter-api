import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Epub from 'epub-gen';
import * as epubParser from 'epub-parser';
import * as htmlPdf from 'html-pdf-node';

import { ConvertEbookDto, EbookTargetFormat } from '../dtos/convert-ebook.dto';
import { CreateEbookDto, EbookSourceFormat } from '../dtos/convert-ebook.dto';

/**
 * Service for handling ebook operations
 */
@Injectable()
export class EbooksService {
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Creates an EPUB ebook from content
   */
  async createEbook(
    dto: CreateEbookDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `ebook_${timestamp}_${randomString}.epub`;
      const filePath = join(this.tmpDir, filename);

      // Prepare content
      let htmlContent = dto.content;
      if (dto.sourceFormat === EbookSourceFormat.TXT) {
        // Convert plain text to HTML
        htmlContent = `<p>${dto.content.replace(/\n/g, '</p><p>')}</p>`;
      } else if (
        !dto.sourceFormat ||
        dto.sourceFormat === EbookSourceFormat.HTML
      ) {
        // Content is already HTML
        htmlContent = dto.content;
      }

      // Create EPUB
      const epubOptions = {
        title: dto.title,
        author: dto.author || 'Unknown Author',
        content: [
          {
            title: dto.title,
            data: htmlContent,
          },
        ],
      };

      await new Promise<void>((resolve, reject) => {
        new Epub(epubOptions, filePath).promise
          .then(() => resolve())
          .catch((error: Error) => reject(error));
      });

      return {
        filePath,
        filename,
        mimeType: 'application/epub+zip',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'EPUB creation failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Converts EPUB to PDF, HTML, or TXT
   */
  async convertEbook(
    fileBuffer: Buffer,
    dto: ConvertEbookDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const inputPath = join(
        this.tmpDir,
        `input_${timestamp}_${randomString}.epub`,
      );

      // Write input file
      await fs.writeFile(inputPath, fileBuffer);

      // Parse EPUB
      const epub = await epubParser.open(inputPath);
      const chapters = await epub.getChapters();

      // Extract all text content
      let fullContent = '';
      for (const chapter of chapters) {
        const chapterContent = await epub.getChapter(chapter.id);
        // Remove HTML tags for text extraction
        const textContent = chapterContent
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        fullContent += textContent + '\n\n';
      }

      let outputBuffer: Buffer;
      let filename: string;
      let mimeType: string;

      if (dto.targetFormat === EbookTargetFormat.PDF) {
        // Convert to HTML first, then to PDF
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const htmlContent = await this.createHtmlFromEpub(epub, chapters);
        // html-pdf-node returns a Promise<Buffer> but types are incorrect
        const pdfPromise = htmlPdf.generatePdf(
          { content: htmlContent },
          { format: 'A4' },
        ) as unknown as Promise<Buffer>;
        const pdfBuffer = await pdfPromise;
        outputBuffer = Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer as Uint8Array);
        filename = `converted_${timestamp}_${randomString}.pdf`;
        mimeType = 'application/pdf';
      } else if (dto.targetFormat === EbookTargetFormat.HTML) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const htmlContent = await this.createHtmlFromEpub(epub, chapters);
        outputBuffer = Buffer.from(htmlContent, 'utf-8');
        filename = `converted_${timestamp}_${randomString}.html`;
        mimeType = 'text/html';
      } else if (dto.targetFormat === EbookTargetFormat.TXT) {
        outputBuffer = Buffer.from(fullContent, 'utf-8');
        filename = `converted_${timestamp}_${randomString}.txt`;
        mimeType = 'text/plain';
      } else {
        throw new BadRequestException(
          `Unsupported target format: ${dto.targetFormat as string}`,
        );
      }

      // Clean up input file
      await fs.unlink(inputPath);

      const filePath = join(this.tmpDir, filename);
      await fs.writeFile(filePath, outputBuffer);

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
        'Ebook conversion failed: ' + (error as Error).message,
      );
    }
  }

  private async createHtmlFromEpub(
    epub: {
      getMetadata: () => Promise<{ title?: string; author?: string }>;
      getChapter: (id: string) => Promise<string>;
    },
    chapters: Array<{ id: string }>,
  ): Promise<string> {
    const metadata = await epub.getMetadata();
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.title || 'Ebook'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { margin-top: 30px; }
  </style>
</head>
<body>
  <h1>${metadata?.title || 'Ebook'}</h1>
  ${metadata?.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
`;

    for (const chapter of chapters) {
      const chapterContent = await epub.getChapter(chapter.id);
      html += `<div class="chapter">${chapterContent}</div>`;
    }

    html += `</body></html>`;
    return html;
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
