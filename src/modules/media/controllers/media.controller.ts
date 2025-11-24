import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { ConvertMediaDto } from '../dtos/convert-media.dto';
import { MediaService } from '../services/media.service';

/**
 * Controller for video and audio conversion endpoints
 */
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('convert')
  @ApiOperation({
    summary: 'Convert video or audio',
    description:
      'Convert video/audio files between formats (MP4, WebM, AVI, MP3, WAV, etc.)',
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
          description: 'Media file (max 200MB)',
        },
        targetFormat: {
          type: 'string',
          description: 'Target format (mp4, mp3, etc.)',
        },
        videoCodec: { type: 'string', description: 'Video codec (optional)' },
        audioCodec: { type: 'string', description: 'Audio codec (optional)' },
        audioBitrate: {
          type: 'string',
          description: 'Audio bitrate (e.g., 192k)',
        },
        videoBitrate: {
          type: 'string',
          description: 'Video bitrate (e.g., 1000k)',
        },
        width: { type: 'number', description: 'Output width' },
        height: { type: 'number', description: 'Output height' },
      },
    },
  })
  async convertMedia(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = 'file';
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
        filename = part.filename || 'file';
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('No file uploaded');
    }

    if (fileBuffer.length > 200 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 200MB limit');
    }

    const dto = new ConvertMediaDto();
    dto.targetFormat = fields.targetFormat;
    dto.videoCodec = fields.videoCodec;
    dto.audioCodec = fields.audioCodec;
    dto.audioBitrate = fields.audioBitrate;
    dto.videoBitrate = fields.videoBitrate;
    dto.width = fields.width ? parseInt(fields.width) : undefined;
    dto.height = fields.height ? parseInt(fields.height) : undefined;

    const result = await this.mediaService.convertMedia(
      fileBuffer,
      filename,
      dto,
    );
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('extract-audio')
  @ApiOperation({
    summary: 'Extract audio from video',
    description: 'Extract audio track from video file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'format'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Video file' },
        format: {
          type: 'string',
          enum: ['mp3', 'wav', 'aac', 'flac'],
          description: 'Audio format',
        },
      },
    },
  })
  async extractAudio(
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

    const result = await this.mediaService.extractAudio(
      fileBuffer,
      fields.format || 'mp3',
    );
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }
}
