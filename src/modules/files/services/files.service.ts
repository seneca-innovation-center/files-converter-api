import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import * as htmlPdf from 'html-pdf-node';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as PDFKit from 'pdfkit';
import * as XLSX from 'xlsx';

import { ConvertFileDto } from '../dtos/convert-file.dto';

/**
 * Service for handling general file conversion operations.
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
      // Parse options if provided
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

      // Perform actual conversion based on source and target formats
      let convertedBuffer: Buffer;

      // Handle conversions
      if (sourceExt === 'docx' && targetExt === 'pdf') {
        convertedBuffer = await this.docxToPdf(fileBuffer);
      } else if (sourceExt === 'docx' && targetExt === 'txt') {
        convertedBuffer = await this.docxToTxt(fileBuffer);
      } else if (sourceExt === 'docx' && targetExt === 'html') {
        convertedBuffer = await this.docxToHtml(fileBuffer);
      } else if (sourceExt === 'xlsx' && targetExt === 'csv') {
        convertedBuffer = await this.xlsxToCsv(fileBuffer);
      } else if (sourceExt === 'xlsx' && targetExt === 'txt') {
        convertedBuffer = await this.xlsxToTxt(fileBuffer);
      } else if (sourceExt === 'xlsx' && targetExt === 'pdf') {
        convertedBuffer = await this.xlsxToPdf(fileBuffer);
      } else if (sourceExt === 'txt' && targetExt === 'pdf') {
        convertedBuffer = await this.txtToPdf(fileBuffer);
      } else if (sourceExt === 'html' && targetExt === 'pdf') {
        convertedBuffer = await this.htmlToPdf(fileBuffer);
      } else if (sourceExt === 'pdf' && targetExt === 'txt') {
        convertedBuffer = await this.pdfToTxt(fileBuffer);
      } else if (sourceExt === 'pdf' && targetExt === 'docx') {
        convertedBuffer = await this.pdfToDocx(fileBuffer);
      } else if (sourceExt === 'csv' && targetExt === 'xlsx') {
        convertedBuffer = await this.csvToXlsx(fileBuffer);
      } else if (sourceExt === 'csv' && targetExt === 'pdf') {
        convertedBuffer = await this.csvToPdf(fileBuffer);
      } else {
        throw new BadRequestException(
          `Conversion from ${sourceExt} to ${targetExt} is not supported. Supported conversions: DOCX→(PDF,TXT,HTML), XLSX→(CSV,TXT,PDF), TXT→PDF, HTML→PDF, PDF→(TXT,DOCX), CSV→(XLSX,PDF)`,
        );
      }

      // Write the converted file
      await fs.writeFile(filePath, convertedBuffer);

      // Determine MIME type based on extension
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        csv: 'text/csv',
        html: 'text/html',
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

  // Conversion Methods

  private async docxToPdf(buffer: Buffer): Promise<Buffer> {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    return this.htmlToPdf(Buffer.from(html));
  }

  private async docxToTxt(buffer: Buffer): Promise<Buffer> {
    const result = await mammoth.extractRawText({ buffer });
    return Buffer.from(result.value);
  }

  private async docxToHtml(buffer: Buffer): Promise<Buffer> {
    const result = await mammoth.convertToHtml({ buffer });
    return Buffer.from(result.value);
  }

  private async xlsxToCsv(buffer: Buffer): Promise<Buffer> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return Buffer.from(csv);
  }

  private async xlsxToTxt(buffer: Buffer): Promise<Buffer> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return Buffer.from(csv);
  }

  private async xlsxToPdf(buffer: Buffer): Promise<Buffer> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return this.txtToPdf(Buffer.from(csv));
  }

  private async csvToXlsx(buffer: Buffer): Promise<Buffer> {
    const csvText = buffer.toString('utf-8');
    const workbook = XLSX.read(csvText, { type: 'string' });
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
    return Buffer.from(xlsxBuffer as ArrayBuffer);
  }

  private async csvToPdf(buffer: Buffer): Promise<Buffer> {
    return this.txtToPdf(buffer);
  }

  private async txtToPdf(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit();
      const chunks: Uint8Array[] = [];

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const text = buffer.toString('utf-8');
      doc.fontSize(12).text(text, {
        align: 'left',
        width: 500,
      });

      doc.end();
    });
  }

  private async htmlToPdf(buffer: Buffer): Promise<Buffer> {
    const html = buffer.toString('utf-8');
    const file = { content: html };
    const options = { format: 'A4' };

    try {
      const pdfBuffer = htmlPdf.generatePdf(file, options) as unknown as Buffer;
      if (!pdfBuffer) {
        throw new Error('PDF generation returned empty buffer');
      }
      return pdfBuffer;
    } catch (error) {
      throw new BadRequestException(
        'HTML to PDF conversion failed: ' + (error as Error).message,
      );
    }
  }

  private async pdfToTxt(buffer: Buffer): Promise<Buffer> {
    let parser: PDFParse | null = null;
    try {
      // Use the new v2 API
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return Buffer.from(result.text);
    } catch (error) {
      throw new BadRequestException(
        'PDF to TXT conversion failed: ' + (error as Error).message,
      );
    } finally {
      // Always destroy the parser to free memory
      if (parser) {
        await parser.destroy();
      }
    }
  }

  private async pdfToDocx(buffer: Buffer): Promise<Buffer> {
    let parser: PDFParse | null = null;
    try {
      // Use the new v2 API
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text;

      // Split text into paragraphs (by double newlines or single newlines)
      const paragraphs = text
        .split(/\n\n|\n/)
        .filter((p) => p.trim().length > 0);

      // Create DOCX document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs.map(
              (paragraphText) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: paragraphText.trim(),
                      size: 24, // 12pt font
                    }),
                  ],
                  spacing: {
                    after: 200, // Add spacing after each paragraph
                  },
                }),
            ),
          },
        ],
      });

      // Generate DOCX buffer
      const docxBuffer = await Packer.toBuffer(doc);
      return Buffer.from(docxBuffer);
    } catch (error) {
      throw new BadRequestException(
        'PDF to DOCX conversion failed: ' + (error as Error).message,
      );
    } finally {
      // Always destroy the parser to free memory
      if (parser) {
        await parser.destroy();
      }
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
