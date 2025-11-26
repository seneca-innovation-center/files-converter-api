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
          enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp', 'svg'],
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
        colorVectorization: {
          type: 'boolean',
          description:
            'For SVG format: use color vectorization (true) or black and white (false). Default: false',
        },
      },
    },
  })
  async convertImage(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    try {
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

      // Validate format field is provided
      if (!fields.format) {
        throw new BadRequestException('Format parameter is required');
      }

      // Parse form fields for conversion parameters
      const dto = new ConvertImageDto();
      dto.format = fields.format as ImageFormat;
      dto.width = fields.width ? parseInt(fields.width, 10) : undefined;
      dto.height = fields.height ? parseInt(fields.height, 10) : undefined;
      dto.quality = fields.quality ? parseInt(fields.quality, 10) : undefined;
      dto.removeBackground = fields.removeBackground === 'true';
      dto.colorVectorization =
        fields.colorVectorization === 'true' ? true : undefined;

      // Log conversion parameters for debugging
      console.info('Conversion parameters:', {
        format: dto.format,
        width: dto.width,
        height: dto.height,
        quality: dto.quality,
        removeBackground: dto.removeBackground,
        colorVectorization: dto.colorVectorization,
        fileSize: fileBuffer.length,
        filename,
      });

      // Validate the format is supported
      if (!Object.values(ImageFormat).includes(dto.format)) {
        throw new BadRequestException(
          `Unsupported format: ${dto.format}. Supported formats: ${Object.values(ImageFormat).join(', ')}`,
        );
      }

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

      console.info('Sending response:', {
        mimeType: result.mimeType,
        filename: result.filename,
        bufferSize: resultBuffer.length,
        isBuffer: Buffer.isBuffer(resultBuffer),
        firstBytes: resultBuffer.slice(0, 10).toString('hex'),
      });

      // For debugging: Log the file path so you can check it manually
      console.info('Converted file saved at:', result.filePath);

      // Set response headers for file download
      await reply
        .type(result.mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        )
        .send(resultBuffer);

      console.info('Response sent successfully');

      // Clean up temporary file after sending (fire and forget)
      // Delayed by 60 seconds for debugging
      setTimeout(() => {
        this.imagesService.deleteFile(result.filePath).catch(() => {
          // Ignore cleanup errors
        });
      }, 60000);
    } catch (error) {
      // Log error for debugging
      console.error('Image conversion error:', error);

      // Re-throw if it's already a NestJS exception
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Wrap other errors
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to convert image',
      );
    }
  }
}
