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
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';

import { ExtractTextDto, OcrLanguage } from '../dtos/extract-text.dto';
import { OcrService } from '../services/ocr.service';

/**
 * Controller for OCR text extraction endpoints
 */
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('ocr')
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('extract')
  @ApiOperation({
    summary: 'Extract text from image (OCR)',
    description: 'Use OCR to extract text from images in multiple languages',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file' },
        language: {
          type: 'string',
          enum: [
            'eng',
            'fra',
            'deu',
            'spa',
            'ita',
            'por',
            'rus',
            'chi_sim',
            'jpn',
            'kor',
            'ara',
          ],
          description: 'OCR language',
        },
        outputFormat: {
          type: 'string',
          enum: ['txt', 'json'],
          description: 'Output format',
        },
      },
    },
  })
  async extractText(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    const dto = new ExtractTextDto();
    dto.language = fields.language as OcrLanguage | undefined;
    dto.outputFormat = fields.outputFormat;

    const result = await this.ocrService.extractText(fileBuffer, dto);
    const buffer = await this.ocrService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    this.ocrService.deleteFile(result.filePath).catch(() => {});
  }
}
