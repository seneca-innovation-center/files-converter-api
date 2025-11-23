import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { Convert3DDto, ThreeDFormat } from '../dtos/convert-3d.dto';
import { ThreeDService } from '../services/3d.service';

/**
 * Controller for handling 3D model conversion endpoints.
 * Provides endpoints for converting 3D models between formats and optimization.
 */
@ApiTags('3d')
@Controller('3d')
export class ThreeDController {
  /**
   * Creates an instance of ThreeDController.
   * @param threeDService Service for 3D model processing operations
   */
  constructor(private readonly threeDService: ThreeDService) {}

  /**
   * Converts a 3D model to the specified format with optional optimization.
   * @param request Fastify request object containing multipart form data
   * @param reply Fastify reply object for sending the file response
   * @returns Stream of the converted 3D model file
   */
  @Post('convert')
  @ApiOperation({
    summary: 'Convert 3D model format',
    description:
      'Converts a 3D model (GLB/GLTF/OBJ) to the specified format with optional optimization and compression.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '3D model file to convert (max 200MB)',
        },
        format: {
          type: 'string',
          enum: ['glb', 'obj', 'usdz'],
          description: 'Target format for conversion',
        },
        optimize: {
          type: 'boolean',
          description: 'Apply optimization (prune, weld)',
          required: false,
        },
        compress: {
          type: 'boolean',
          description: 'Apply Draco compression for GLB files',
          required: false,
        },
      },
    },
  })
  async convert3D(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Parse multipart form data using Fastify's multipart API
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = 'model';
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
        filename = part.filename || 'model';
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
    const dto = new Convert3DDto();
    dto.format = (fields.format as ThreeDFormat) || ThreeDFormat.GLB;
    dto.optimize = fields.optimize === 'true';
    dto.compress = fields.compress === 'true';

    // Process the 3D model
    const result = await this.threeDService.convert3DModel(
      fileBuffer,
      filename,
      dto,
    );

    // Get file buffer for content length
    const resultBuffer = await this.threeDService.getFileBuffer(
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
    this.threeDService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
