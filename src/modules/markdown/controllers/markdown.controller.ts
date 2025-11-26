import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import {
  ConvertMarkdownDto,
  MarkdownFormat,
} from '../dtos/convert-markdown.dto';
import { MarkdownService } from '../services/markdown.service';

/**
 * Controller for markdown conversion endpoints
 */
@ApiTags('markdown')
@Controller('markdown')
export class MarkdownController {
  constructor(private readonly markdownService: MarkdownService) {}

  @Post('convert')
  @ApiOperation({
    summary: 'Convert Markdown',
    description: 'Convert Markdown to HTML or PDF',
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
          description: 'Markdown file',
        },
        targetFormat: { type: 'string', enum: ['html', 'pdf'] },
      },
    },
  })
  async convertMarkdown(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // This is the correct, safe, and idiomatic way
        fileBuffer = await part.toBuffer();
        // Continue collecting fields even after file (in case fields come after)
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const dto = new ConvertMarkdownDto();
    dto.targetFormat = fields.targetFormat as MarkdownFormat;

    const result = await this.markdownService.convertMarkdown(fileBuffer, dto);
    const buffer = await this.markdownService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    // Clean up temp file
    this.markdownService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('html-to-markdown')
  @ApiOperation({
    summary: 'Convert HTML to Markdown',
    description: 'Convert HTML file to Markdown',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'HTML file' },
      },
    },
  })
  async htmlToMarkdown(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        // This is the official, safe, and correct way
        fileBuffer = await part.toBuffer();
        break; // Only handle the first file
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.markdownService.htmlToMarkdown(fileBuffer);
    const buffer = await this.markdownService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    // Clean up temp file
    this.markdownService.deleteFile(result.filePath).catch(() => {});
  }
}
