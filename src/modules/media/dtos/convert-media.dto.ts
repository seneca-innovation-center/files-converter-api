import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/**
 * Supported video formats
 */
export enum VideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
  AVI = 'avi',
  MOV = 'mov',
  MKV = 'mkv',
  GIF = 'gif',
}

/**
 * Supported audio formats
 */
export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  FLAC = 'flac',
  AAC = 'aac',
  M4A = 'm4a',
}

/**
 * DTO for media conversion request
 */
export class ConvertMediaDto {
  @ApiProperty({
    description: 'Target format',
    example: 'mp4',
  })
  @IsString()
  @IsNotEmpty()
  targetFormat: string;

  @ApiProperty({
    description: 'Video codec (for video conversions)',
    required: false,
    example: 'libx264',
  })
  @IsOptional()
  @IsString()
  videoCodec?: string;

  @ApiProperty({
    description: 'Audio codec',
    required: false,
    example: 'aac',
  })
  @IsOptional()
  @IsString()
  audioCodec?: string;

  @ApiProperty({
    description: 'Audio bitrate (e.g., 128k, 192k, 320k)',
    required: false,
    example: '192k',
  })
  @IsOptional()
  @IsString()
  audioBitrate?: string;

  @ApiProperty({
    description: 'Video bitrate (e.g., 1000k, 2000k)',
    required: false,
    example: '1000k',
  })
  @IsOptional()
  @IsString()
  videoBitrate?: string;

  @ApiProperty({
    description: 'Output width in pixels',
    required: false,
    minimum: 1,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  width?: number;

  @ApiProperty({
    description: 'Output height in pixels',
    required: false,
    minimum: 1,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  height?: number;
}
