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

import { AuthGuard } from '../../auth/guards/auth.guard';
import { CreateEbookDto } from '../dtos/convert-ebook.dto';
import { ConvertEbookDto, EbookTargetFormat } from '../dtos/convert-ebook.dto';
import { EbooksService } from '../services/ebooks.service';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('ebooks')
@Controller('ebooks')
export class EbooksController {
  constructor(private readonly ebooksService: EbooksService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create an EPUB ebook from content' })
  @ApiBody({ type: CreateEbookDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'EPUB created successfully',
    type: Buffer,
  })
  async createEbook(
    @Body() dto: CreateEbookDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.ebooksService.createEbook(dto);
    const buffer = await this.ebooksService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.ebooksService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert EPUB to PDF, HTML, or TXT' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'targetFormat'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'EPUB file (max 200MB)',
        },
        targetFormat: {
          type: 'string',
          enum: Object.values(EbookTargetFormat),
          description: 'Target format (pdf, html, txt)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ebook converted successfully',
    type: Buffer,
  })
  async convertEbook(
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
      throw new BadRequestException('No EPUB file uploaded');
    }

    const dto = new ConvertEbookDto();
    dto.targetFormat = fields.targetFormat as EbookTargetFormat;

    if (!dto.targetFormat) {
      throw new BadRequestException('Target format is required');
    }

    const result = await this.ebooksService.convertEbook(fileBuffer, dto);
    const buffer = await this.ebooksService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.ebooksService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
