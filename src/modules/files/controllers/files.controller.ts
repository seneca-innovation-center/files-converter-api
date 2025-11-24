import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { ConvertFileDto } from '../dtos/convert-file.dto';
import { FilesService } from '../services/files.service';

/**
 * Controller for handling general file conversion endpoints.
 * Provides endpoints for converting files between various formats.
 */
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
}
