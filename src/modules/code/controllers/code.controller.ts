import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { AuthGuard } from '../../auth/guards/auth.guard';
import { FormatCodeDto, CodeLanguage } from '../dtos/format-code.dto';
import { CodeService } from '../services/code.service';

/**
 * Controller for code formatting and highlighting endpoints
 */
@UseGuards(AuthGuard)
@ApiBearerAuth()
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
        fileBuffer = await part.toBuffer(); // Clean, safe, properly typed
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const dto = new FormatCodeDto();
    dto.language = fields.language as CodeLanguage | undefined;
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
