import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';

import { ConvertFileDto } from '../dtos/convert-file.dto';
import { SplitPdfDto, FillPdfFormDto } from '../dtos/pdf-operations.dto';
import { FilesService } from '../services/files.service';

/**
 * Controller for handling general file conversion endpoints.
 * Provides endpoints for converting files between various formats.
 */
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('files')
@Controller('files')
export class FilesController {
  /**
   * Creates an instance of FilesController.
   * @param filesService Service for file processing operations
   */
  constructor(private readonly filesService: FilesService) {}

  /**
   * Converts a file to the specified format.
   * @param request Fastify request object containing multipart form data
   * @param reply Fastify reply object for sending the file response
   * @returns Stream of the converted file
   */
  @Post('convert')
  @ApiOperation({
    summary: 'Convert file format',
    description:
      'Converts a file to the specified format. Supports various document, image, and archive formats.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'targetFormat'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to convert (max 200MB)',
        },
        targetFormat: {
          type: 'string',
          description: 'Target format/extension (e.g., pdf, docx, txt)',
        },
        options: {
          type: 'string',
          description: 'Additional conversion options (JSON string)',
        },
      },
    },
  })
  async convertFile(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Parse multipart form data using Fastify's multipart API
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = 'file';
    const fields: Record<string, string> = {};

    // Process all multipart parts
    for await (const part of parts) {
      if (part.type === 'file') {
        // Read file buffer into memory
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          // Convert chunk to Buffer if it's a Blob
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
          } else {
            // Handle Blob or other types by converting to Buffer
            const arrayBuffer = await (chunk as Blob).arrayBuffer();
            chunks.push(Buffer.from(arrayBuffer));
          }
        }
        fileBuffer = Buffer.concat(chunks);
        filename = part.filename || 'file';
      } else if (part.type === 'field') {
        // Store form field values
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size (200MB limit)
    const maxSize = 200 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new BadRequestException('File size exceeds 200MB limit');
    }

    // Parse form fields for conversion parameters
    const dto = new ConvertFileDto();
    dto.targetFormat = fields.targetFormat || '';

    if (!dto.targetFormat) {
      throw new BadRequestException('Target format is required');
    }

    dto.options = fields.options;

    // Process the file
    const result = await this.filesService.convertFile(
      fileBuffer,
      filename,
      dto,
    );

    // Get file buffer for content length
    const resultBuffer = await this.filesService.getFileBuffer(result.filePath);

    // Set response headers for file download
    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', resultBuffer.length.toString());

    // Send the file
    await reply.send(resultBuffer);

    // Clean up temporary file after sending (fire and forget)
    this.filesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('pdf/merge')
  @ApiOperation({ summary: 'Merge multiple PDF files into one' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple PDF files to merge (max 200MB total)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDFs merged successfully',
    type: Buffer,
  })
  async mergePdfs(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    const pdfBuffers: Buffer[] = [];
    let totalSize = 0;
    const maxSize = 200 * 1024 * 1024;

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
          } else {
            const arrayBuffer = await (chunk as Blob).arrayBuffer();
            chunks.push(Buffer.from(arrayBuffer));
          }
        }
        const fileBuffer = Buffer.concat(chunks);
        totalSize += fileBuffer.length;
        if (totalSize > maxSize) {
          throw new BadRequestException('Total file size exceeds 200MB limit');
        }
        pdfBuffers.push(fileBuffer);
      }
    }

    if (pdfBuffers.length === 0) {
      throw new BadRequestException('No PDF files uploaded');
    }

    const result = await this.filesService.mergePdfs(pdfBuffers);
    const buffer = await this.filesService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.filesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('pdf/split')
  @ApiOperation({ summary: 'Split a PDF file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to split',
        },
        splitFrom: {
          type: 'number',
          description: 'Page number to split from (1-indexed)',
        },
        splitTo: {
          type: 'number',
          description: 'Page number to split to (1-indexed)',
        },
        splitAt: {
          type: 'string',
          description: 'Split at specific page numbers (comma-separated)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF split successfully',
    type: Buffer,
  })
  async splitPdf(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
          } else {
            const arrayBuffer = await (chunk as Blob).arrayBuffer();
            chunks.push(Buffer.from(arrayBuffer));
          }
        }
        fileBuffer = Buffer.concat(chunks);
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No PDF file uploaded');
    }

    const dto = new SplitPdfDto();
    dto.splitFrom = fields.splitFrom
      ? parseInt(fields.splitFrom, 10)
      : undefined;
    dto.splitTo = fields.splitTo ? parseInt(fields.splitTo, 10) : undefined;
    dto.splitAt = fields.splitAt;

    const result = await this.filesService.splitPdf(fileBuffer, dto);
    const buffer = await this.filesService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.filesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('pdf/fill-form')
  @ApiOperation({ summary: 'Fill PDF form fields' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'formData'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file with form fields',
        },
        formData: {
          type: 'string',
          description: 'Form field values as JSON string',
          example: '{"name": "John Doe", "email": "john@example.com"}',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF form filled successfully',
    type: Buffer,
  })
  async fillPdfForm(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
          } else {
            const arrayBuffer = await (chunk as Blob).arrayBuffer();
            chunks.push(Buffer.from(arrayBuffer));
          }
        }
        fileBuffer = Buffer.concat(chunks);
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No PDF file uploaded');
    }

    const dto = new FillPdfFormDto();
    dto.formData = fields.formData;

    if (!dto.formData) {
      throw new BadRequestException('Form data is required');
    }

    const result = await this.filesService.fillPdfForm(fileBuffer, dto);
    const buffer = await this.filesService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.filesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('excel/export-chart')
  @ApiOperation({ summary: 'Export Excel chart as image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file with charts',
        },
        sheetName: {
          type: 'string',
          description: 'Sheet name (optional, defaults to first sheet)',
        },
        chartIndex: {
          type: 'number',
          description: 'Chart index (defaults to 0)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chart exported successfully',
    type: Buffer,
  })
  async exportExcelChart(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
          } else {
            const arrayBuffer = await (chunk as Blob).arrayBuffer();
            chunks.push(Buffer.from(arrayBuffer));
          }
        }
        fileBuffer = Buffer.concat(chunks);
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No Excel file uploaded');
    }

    const sheetName = fields.sheetName;
    const chartIndex = fields.chartIndex ? parseInt(fields.chartIndex, 10) : 0;

    const result = await this.filesService.exportExcelChart(
      fileBuffer,
      sheetName,
      chartIndex,
    );
    const buffer = await this.filesService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.filesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
