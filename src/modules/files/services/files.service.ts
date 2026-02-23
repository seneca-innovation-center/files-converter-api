import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import * as ExcelJS from 'exceljs';
import * as htmlPdf from 'html-pdf-node';
import * as mammoth from 'mammoth';
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import * as PDFKit from 'pdfkit';
import * as XLSX from 'xlsx';

import { ConvertFileDto } from '../dtos/convert-file.dto';
import { SplitPdfDto, FillPdfFormDto } from '../dtos/pdf-operations.dto';

/**
 * Service for handling general file conversion operations.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
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
      let _options: Record<string, unknown> = {};
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

      this.logger.log(`Converting ${sourceExt} to ${targetExt}`);

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
   * Merges multiple PDF files into one
   */
  async mergePdfs(
    pdfBuffers: Buffer[],
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      if (pdfBuffers.length === 0) {
        throw new BadRequestException('At least one PDF file is required');
      }

      this.logger.log(`Merging ${pdfBuffers.length} PDFs`);

      const mergedPdf = await PDFDocument.create();

      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `merged_${timestamp}_${randomString}.pdf`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, Buffer.from(mergedPdfBytes));

      return {
        filePath,
        filename,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'PDF merge failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Splits a PDF file
   */
  async splitPdf(
    pdfBuffer: Buffer,
    dto: SplitPdfDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      this.logger.log('Splitting PDF');

      const pdf = await PDFDocument.load(pdfBuffer);
      const totalPages = pdf.getPageCount();

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);

      if (dto.splitAt) {
        // Split at specific page numbers
        const splitPages = dto.splitAt
          .split(',')
          .map((p) => parseInt(p.trim(), 10));
        splitPages.sort((a, b) => a - b);

        // Create a ZIP with multiple PDFs
        const results: Array<{ filePath: string; filename: string }> = [];

        let startPage = 0;
        for (let i = 0; i < splitPages.length; i++) {
          const endPage = splitPages[i] - 1; // Convert to 0-indexed
          const newPdf = await PDFDocument.create();
          const pages = await newPdf.copyPages(
            pdf,
            Array.from(
              { length: endPage - startPage + 1 },
              (_, i) => startPage + i,
            ),
          );
          pages.forEach((page) => newPdf.addPage(page));

          const pdfBytes = await newPdf.save();
          const filename = `split_${startPage + 1}_${endPage + 1}_${timestamp}_${randomString}.pdf`;
          const filePath = join(this.tmpDir, filename);
          await fs.writeFile(filePath, pdfBytes);
          results.push({ filePath, filename });

          startPage = endPage + 1;
        }

        // Return the first split (or create a ZIP in production)
        return {
          filePath: results[0].filePath,
          filename: results[0].filename,
          mimeType: 'application/pdf',
        };
      } else if (dto.splitFrom && dto.splitTo) {
        // Split specific range
        const fromPage = Math.max(0, dto.splitFrom - 1); // Convert to 0-indexed
        const toPage = Math.min(totalPages - 1, dto.splitTo - 1);

        if (fromPage > toPage) {
          throw new BadRequestException(
            'splitFrom must be less than or equal to splitTo',
          );
        }

        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(
          pdf,
          Array.from({ length: toPage - fromPage + 1 }, (_, i) => fromPage + i),
        );
        pages.forEach((page) => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        const filename = `split_${dto.splitFrom}_${dto.splitTo}_${timestamp}_${randomString}.pdf`;
        const filePath = join(this.tmpDir, filename);
        await fs.writeFile(filePath, pdfBytes);

        return {
          filePath,
          filename,
          mimeType: 'application/pdf',
        };
      } else {
        throw new BadRequestException(
          'Either splitAt or both splitFrom and splitTo must be provided',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'PDF split failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Fills PDF form fields
   */
  async fillPdfForm(
    pdfBuffer: Buffer,
    dto: FillPdfFormDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      this.logger.log('Filling PDF form');

      const pdf = await PDFDocument.load(pdfBuffer);
      const form = pdf.getForm();

      // Parse form data
      const formData = JSON.parse(dto.formData);

      // Fill form fields
      const fields = form.getFields();
      for (const field of fields) {
        const fieldName = field.getName();
        if (formData[fieldName] !== undefined) {
          if (field instanceof PDFTextField) {
            field.setText(String(formData[fieldName]));
          } else if (field instanceof PDFCheckBox) {
            if (formData[fieldName]) {
              field.check();
            } else {
              field.uncheck();
            }
          } else if (field instanceof PDFDropdown) {
            field.select(String(formData[fieldName]));
          } else if (field instanceof PDFRadioGroup) {
            field.select(String(formData[fieldName]));
          }
        }
      }

      // Flatten form (make it non-editable)
      form.flatten();

      const pdfBytes = await pdf.save();

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `filled_${timestamp}_${randomString}.pdf`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, pdfBytes);

      return {
        filePath,
        filename,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'PDF form filling failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Exports Excel chart as image
   * Extracts chart data from Excel and renders it using Chart.js
   */
  async exportExcelChart(
    excelBuffer: Buffer,
    sheetName?: string,
    _chartIndex: number = 0,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      this.logger.log('Exporting Excel chart');

      const workbook = new ExcelJS.Workbook();
      // ExcelJS expects Buffer or ArrayBuffer
      // Convert Buffer to ArrayBuffer to satisfy type requirements
      const uint8Array = new Uint8Array(excelBuffer);
      const arrayBuffer = uint8Array.buffer.slice(
        uint8Array.byteOffset,
        uint8Array.byteOffset + uint8Array.byteLength,
      );
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = sheetName
        ? workbook.getWorksheet(sheetName)
        : workbook.worksheets[0];

      if (!worksheet) {
        throw new BadRequestException('Worksheet not found');
      }

      // ExcelJS doesn't provide direct access to chart data
      // We'll extract numeric data from the worksheet and create a chart visualization
      // This approach works by analyzing the worksheet data and creating a chart from it

      // Extract data range from chart (if available in chart definition)
      // Since ExcelJS doesn't expose chart data directly, we'll extract
      // all numeric data from the worksheet and create a visualization
      const dataRows: Array<Array<string | number>> = [];
      const labels: string[] = [];
      const datasets: Array<{ label: string; data: number[] }> = [];

      // Read worksheet data
      worksheet.eachRow((row) => {
        const rowData: Array<string | number> = [];
        row.eachCell((cell, colNumber) => {
          if (cell.value !== null && cell.value !== undefined) {
            const value =
              typeof cell.value === 'object' && 'text' in cell.value
                ? cell.value.text
                : cell.value;
            rowData[colNumber - 1] = value as string | number;
          }
        });
        if (rowData.length > 0) {
          dataRows.push(rowData);
        }
      });

      // If we have data, create a chart from it
      if (dataRows.length === 0) {
        throw new BadRequestException(
          'No data found in the worksheet to create a chart',
        );
      }

      // Use first row as labels (if it contains strings)
      const firstRow = dataRows[0];
      const isFirstRowLabels = firstRow.some((val) => typeof val === 'string');

      if (isFirstRowLabels && dataRows.length > 1) {
        // First row is headers
        firstRow.forEach((val, idx) => {
          if (typeof val === 'string') {
            labels.push(val);
          } else {
            labels.push(`Column ${idx + 1}`);
          }
        });

        // Extract data series (skip first row)
        for (let i = 1; i < dataRows.length; i++) {
          const row = dataRows[i];
          const numericData: number[] = [];
          row.forEach((val) => {
            if (typeof val === 'number') {
              numericData.push(val);
            }
          });
          if (numericData.length > 0) {
            datasets.push({
              label: `Series ${i}`,
              data: numericData,
            });
          }
        }
      } else {
        // No headers, use row numbers as labels
        dataRows.forEach((row, idx) => {
          labels.push(`Row ${idx + 1}`);
          const numericData: number[] = [];
          row.forEach((val) => {
            if (typeof val === 'number') {
              numericData.push(val);
            }
          });
          if (numericData.length > 0) {
            datasets.push({
              label: `Series ${idx + 1}`,
              data: numericData,
            });
          }
        });
      }

      if (datasets.length === 0) {
        throw new BadRequestException(
          'No numeric data found in the worksheet to create a chart',
        );
      }

      // Limit labels to match data length
      const maxDataLength = Math.max(...datasets.map((ds) => ds.data.length));
      const chartLabels = labels.slice(0, maxDataLength);

      // Create chart using Chart.js
      const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width: 800,
        height: 600,
        backgroundColour: 'white',
      });

      // Determine chart type based on data
      const chartType: 'line' | 'bar' | 'pie' =
        datasets.length === 1 ? 'pie' : 'bar';

      const configuration = {
        type: chartType,
        data: {
          labels: chartLabels,
          datasets: datasets.map((ds, idx) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)',
            ][idx % 6],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
            ][idx % 6],
            borderWidth: 2,
          })),
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: worksheet.name || 'Chart',
            },
            legend: {
              display: datasets.length > 1,
            },
          },
        },
      };

      // Render chart to image buffer
      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

      // Generate output filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `chart_${timestamp}_${randomString}.png`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, imageBuffer);

      return {
        filePath,
        filename,
        mimeType: 'image/png',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Excel chart export failed: ' + (error as Error).message,
      );
    }
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
