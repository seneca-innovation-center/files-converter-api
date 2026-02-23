import {
  Controller,
  Post,
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
import { ConvertMediaDto } from '../dtos/convert-media.dto';
import {
  TrimVideoDto,
  ExtractFrameDto,
  SubtitleOperationDto,
  TranscribeVideoDto,
} from '../dtos/video-operations.dto';
import { MediaService } from '../services/media.service';

/**
 * Controller for video and audio conversion endpoints
 */
@UseGuards(AuthGuard)
@ApiBearerAuth()
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
        fileBuffer = await part.toBuffer();
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
        fileBuffer = await part.toBuffer();
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

  @Post('thumbnail')
  @ApiOperation({ summary: 'Generate thumbnail from video (first frame)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file',
        },
        time: {
          type: 'number',
          description: 'Time in seconds to capture (default: 0)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thumbnail generated successfully',
    type: Buffer,
  })
  async generateThumbnail(
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
      throw new BadRequestException('No video file uploaded');
    }

    const time = fields.time ? parseFloat(fields.time) : 0;
    const result = await this.mediaService.generateThumbnail(fileBuffer, time);
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('trim')
  @ApiOperation({ summary: 'Trim/cut video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'startTime', 'endTime'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file',
        },
        startTime: {
          type: 'number',
          description: 'Start time in seconds',
        },
        endTime: {
          type: 'number',
          description: 'End time in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Video trimmed successfully',
    type: Buffer,
  })
  async trimVideo(
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
      throw new BadRequestException('No video file uploaded');
    }

    const dto = new TrimVideoDto();
    dto.startTime = fields.startTime ? parseFloat(fields.startTime) : 0;
    dto.endTime = fields.endTime ? parseFloat(fields.endTime) : 0;

    const result = await this.mediaService.trimVideo(fileBuffer, dto);
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge multiple videos' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple video files to merge',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Videos merged successfully',
    type: Buffer,
  })
  async mergeVideos(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    const videoBuffers: Buffer[] = [];

    for await (const part of parts) {
      if (part.type === 'file') {
        videoBuffers.push(await part.toBuffer());
      }
    }

    if (videoBuffers.length === 0) {
      throw new BadRequestException('No video files uploaded');
    }

    const result = await this.mediaService.mergeVideos(videoBuffers);
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('extract-frame')
  @ApiOperation({ summary: 'Extract frame from video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file',
        },
        time: {
          type: 'number',
          description: 'Time in seconds to extract frame',
        },
        frameNumber: {
          type: 'number',
          description: 'Frame number to extract',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Output format',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Frame extracted successfully',
    type: Buffer,
  })
  async extractFrame(
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
      throw new BadRequestException('No video file uploaded');
    }

    const dto = new ExtractFrameDto();
    dto.time = fields.time ? parseFloat(fields.time) : undefined;
    dto.frameNumber = fields.frameNumber
      ? parseInt(fields.frameNumber, 10)
      : undefined;
    dto.format = (fields.format as 'png' | 'jpeg') || 'png';

    const result = await this.mediaService.extractFrame(fileBuffer, dto);
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());
    reply.send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('subtitles')
  @ApiOperation({ summary: 'Extract or embed subtitles' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file',
        },
        subtitleFile: {
          type: 'string',
          format: 'binary',
          description: 'Subtitle file (for embedding)',
        },
        subtitleText: {
          type: 'string',
          description: 'Subtitle text content (for embedding)',
        },
        operation: {
          type: 'string',
          enum: ['extract', 'embed'],
          description: 'Operation: extract or embed',
        },
        format: {
          type: 'string',
          enum: ['srt', 'vtt', 'ass'],
          description: 'Subtitle format',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subtitle operation completed successfully',
    type: Buffer,
  })
  @Post('subtitles')
  async handleSubtitles(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let subtitleFile: Buffer | null = null;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'subtitleFile') {
          subtitleFile = buffer;
        } else {
          fileBuffer = buffer;
        }
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer) throw new BadRequestException('No video file uploaded');

    const dto = new SubtitleOperationDto();
    dto.subtitleFile = subtitleFile || undefined;
    dto.subtitleText = fields.subtitleText;
    dto.operation = (fields.operation as 'extract' | 'embed') || 'extract';
    dto.format = (fields.format as 'srt' | 'vtt' | 'ass') || 'srt';

    const result = await this.mediaService.handleSubtitles(fileBuffer, dto);
    const buffer = await this.mediaService.getFileBuffer(result.filePath);

    reply
      .header('Content-Type', result.mimeType)
      .header(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      )
      .header('Content-Length', buffer.length.toString())
      .send(buffer);

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }

  @Post('transcribe')
  @ApiOperation({
    summary: 'Transcribe video to text using speech recognition',
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
          description: 'Video file to transcribe',
        },
        language: {
          type: 'string',
          description:
            'Language code (e.g., en, fr, es). Auto-detect if not provided',
        },
        outputFormat: {
          type: 'string',
          enum: ['txt', 'srt', 'vtt', 'json'],
          description: 'Output format (default: txt)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Video transcribed successfully',
    type: Buffer,
  })
  async transcribeVideo(
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
      throw new BadRequestException('No video file uploaded');
    }

    const dto = new TranscribeVideoDto();
    dto.language = fields.language;
    dto.outputFormat =
      (fields.outputFormat as 'txt' | 'srt' | 'vtt' | 'json') || 'txt';

    const result = await this.mediaService.transcribeVideo(fileBuffer, dto);

    // For text-based content, send the string directly to ensure proper UTF-8 encoding
    if (result.content) {
      reply
        .header('Content-Type', result.mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        )
        .send(result.content);
    } else {
      // For binary content, read from file
      const buffer = await this.mediaService.getFileBuffer(result.filePath);
      reply
        .header('Content-Type', result.mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${result.filename}"`,
        )
        .header('Content-Length', buffer.length.toString())
        .send(buffer);
    }

    this.mediaService.deleteFile(result.filePath).catch(() => {});
  }
}
