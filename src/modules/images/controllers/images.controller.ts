import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { ConvertImageDto, ImageFormat } from '../dtos/convert-image.dto';
import { ImagesService } from '../services/images.service';

/**
 * Controller for handling image conversion endpoints.
 * Provides endpoints for converting images between formats, resizing, and background removal.
 */
@ApiTags('images')
@Controller('images')
export class ImagesController {
  /**
   * Creates an instance of ImagesController.
   * @param imagesService Service for image processing operations
   */
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * Converts an image to the specified format with optional resizing and background removal.
   * @param request Fastify request object containing multipart form data
   * @param reply Fastify reply object for sending the file response
   * @returns Stream of the converted image file
   */
  @Post('convert')
  @ApiOperation({
    summary: 'Convert image format',
    description:
      'Converts an image to the specified format with optional resizing and AI background removal.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'format'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to convert (max 200MB)',
        },
        format: {
          type: 'string',
          enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp'],
          description: 'Target format for conversion',
        },
        width: {
          type: 'number',
          description: 'Optional width for resizing',
        },
        height: {
          type: 'number',
          description: 'Optional height for resizing',
        },
        quality: {
          type: 'number',
          description: 'Quality for JPEG/WebP (1-100)',
        },
        removeBackground: {
          type: 'boolean',
          description: 'Remove background using AI',
        },
      },
    },
  })
  async convertImage(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Parse multipart form data using Fastify's multipart API
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = 'image';
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
        filename = part.filename || 'image';
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
    const dto = new ConvertImageDto();
    dto.format = (fields.format as ImageFormat) || ImageFormat.PNG;
    dto.width = fields.width ? parseInt(fields.width, 10) : undefined;
    dto.height = fields.height ? parseInt(fields.height, 10) : undefined;
    dto.quality = fields.quality ? parseInt(fields.quality, 10) : undefined;
    dto.removeBackground = fields.removeBackground === 'true';

    // Process the image
    const result = await this.imagesService.convertImage(
      fileBuffer,
      filename,
      dto,
    );

    // Get file buffer for content length
    const resultBuffer = await this.imagesService.getFileBuffer(
      result.filePath,
    );

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
    this.imagesService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
