import {
  Controller,
  Post,
  Body,
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

import {
  ConvertPresentationDto,
  PresentationTargetFormat,
} from '../dtos/convert-presentation.dto';
import { CreatePresentationDto } from '../dtos/create-presentation.dto';
import { PresentationsService } from '../services/presentations.service';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('presentations')
@Controller('presentations')
export class PresentationsController {
  constructor(private readonly presentationsService: PresentationsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a PPTX presentation from structured data' })
  @ApiBody({ type: CreatePresentationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presentation created successfully',
    type: Buffer,
  })
  async createPresentation(
    @Body() dto: CreatePresentationDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.presentationsService.createPresentation(dto);
    const buffer = await this.presentationsService.getFileBuffer(
      result.filePath,
    );

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.presentationsService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert PPTX to PDF or images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'targetFormat'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PPTX file (max 200MB)',
        },
        targetFormat: {
          type: 'string',
          enum: Object.values(PresentationTargetFormat),
          description: 'Target format (pdf, png, jpeg)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presentation converted successfully',
    type: Buffer,
  })
  async convertPresentation(
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
      throw new BadRequestException('No PPTX file uploaded');
    }

    const dto = new ConvertPresentationDto();
    dto.targetFormat = fields.targetFormat as PresentationTargetFormat;

    if (!dto.targetFormat) {
      throw new BadRequestException('Target format is required');
    }

    const result = await this.presentationsService.convertPresentation(
      fileBuffer,
      dto,
    );
    const buffer = await this.presentationsService.getFileBuffer(
      result.filePath,
    );

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.presentationsService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
