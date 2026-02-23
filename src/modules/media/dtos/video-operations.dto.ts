import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class TrimVideoDto {
  @ApiProperty({
    description: 'Start time in seconds',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  startTime: number;

  @ApiProperty({
    description: 'End time in seconds',
    example: 30,
  })
  @IsNumber()
  @Min(0)
  endTime: number;
}

export class ExtractFrameDto {
  @ApiProperty({
    description: 'Time in seconds to extract frame',
    example: 5.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  time?: number;

  @ApiProperty({
    description: 'Frame number to extract (alternative to time)',
    required: false,
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  frameNumber?: number;

  @ApiProperty({
    description: 'Output format (png, jpeg)',
    required: false,
    example: 'png',
  })
  @IsString()
  @IsOptional()
  format?: string;
}

export class SubtitleOperationDto {
  @ApiProperty({
    description: 'Subtitle file (SRT, VTT, ASS)',
    required: false,
  })
  @IsOptional()
  subtitleFile?: Buffer;

  @ApiProperty({
    description: 'Subtitle text content (if not uploading file)',
    required: false,
    example: '1\n00:00:00,000 --> 00:00:05,000\nHello World',
  })
  @IsString()
  @IsOptional()
  subtitleText?: string;

  @ApiProperty({
    description: 'Subtitle format (srt, vtt, ass)',
    required: false,
    example: 'srt',
  })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({
    description: 'Operation: extract or embed',
    required: false,
    example: 'embed',
  })
  @IsString()
  @IsOptional()
  operation?: string;
}

export class TranscribeVideoDto {
  @ApiProperty({
    description:
      'Language code for transcription (e.g., en, fr, es). Auto-detect if not provided',
    required: false,
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'Output format for transcription (txt, srt, vtt, json)',
    required: false,
    example: 'txt',
  })
  @IsString()
  @IsOptional()
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json';
}
