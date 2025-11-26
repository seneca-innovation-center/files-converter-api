import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { CreateArchiveDto, ArchiveFormat } from '../dtos/create-archive.dto';
import { ArchivesService } from '../services/archives.service';

/**
 * Controller for archive creation and extraction
 */
@ApiTags('archives')
@Controller('archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create archive',
    description: 'Create a ZIP, TAR, or TAR.GZ archive from multiple files',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Files to archive',
        },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz'],
          description: 'Archive format',
        },
        compressionLevel: {
          type: 'number',
          minimum: 0,
          maximum: 9,
          description: 'Compression level (ZIP only)',
        },
      },
    },
  })
  async createArchive(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    const files: Array<{ buffer: Buffer; filename: string }> = [];
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
        files.push({
          buffer: Buffer.concat(chunks),
          filename: part.filename || 'file',
        });
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const dto = new CreateArchiveDto();
    dto.format = fields.format as ArchiveFormat;
    dto.compressionLevel = fields.compressionLevel
      ? parseInt(fields.compressionLevel)
      : undefined;

    const result = await this.archivesService.createArchive(files, dto);
    const buffer = await this.archivesService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    this.archivesService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('extract')
  @ApiOperation({
    summary: 'Extract archive',
    description: 'Extract files from ZIP, TAR, or TAR.GZ archive',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archive file to extract',
        },
      },
    },
  })
  async extractArchive(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = 'archive';

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
        filename = part.filename || 'archive';
        break;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const extractedFiles = await this.archivesService.extractArchive(
      fileBuffer,
      filename,
    );

    // Return as JSON with file information
    await reply.send({
      success: true,
      filesCount: extractedFiles.length,
      files: extractedFiles.map((f) => ({
        filename: f.filename,
        size: f.buffer.length,
        data: f.buffer.toString('base64'),
      })),
    });
  }
}
