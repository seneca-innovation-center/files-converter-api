import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { FormatCodeDto } from '../dtos/format-code.dto';
import { CodeService } from '../services/code.service';

/**
 * Controller for code formatting and highlighting endpoints
 */
@ApiTags('code')
@Controller('code')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Post('format')
  @ApiOperation({
    summary: 'Format code',
    description: 'Format and/or syntax highlight code files',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Code file' },
        language: {
          type: 'string',
          enum: [
            'javascript',
            'typescript',
            'python',
            'java',
            'html',
            'css',
            'json',
          ],
          description: 'Programming language',
        },
        outputFormat: {
          type: 'string',
          enum: ['formatted', 'html'],
          description: 'Output format',
        },
      },
    },
  })
  async formatCode(
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
          chunks.push(
            chunk instanceof Buffer
              ? chunk
              : Buffer.from(await (chunk as Blob).arrayBuffer()),
          );
        }
        fileBuffer = Buffer.concat(chunks);
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const dto = new FormatCodeDto();
    dto.language = fields.language as any;
    dto.outputFormat = fields.outputFormat;

    const result = await this.codeService.formatCode(fileBuffer, dto);
    const buffer = await this.codeService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    this.codeService.deleteFile(result.filePath).catch(() => {});
  }
}
