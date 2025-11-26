import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Supported image output formats for conversion
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  TIFF = 'tiff',
  BMP = 'bmp',
  SVG = 'svg',
}

/**
 * DTO for image conversion request
 */
export class ConvertImageDto {
  @ApiProperty({
    description: 'Target format for the converted image',
    enum: ImageFormat,
    example: ImageFormat.PNG,
  })
  @IsEnum(ImageFormat)
  format: ImageFormat;

  @ApiProperty({
    description:
      'Optional width for resizing (maintains aspect ratio if only width is provided)',
    required: false,
    minimum: 1,
    maximum: 10000,
    example: 1920,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  width?: number;

  @ApiProperty({
    description:
      'Optional height for resizing (maintains aspect ratio if only height is provided)',
    required: false,
    minimum: 1,
    maximum: 10000,
    example: 1080,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  height?: number;

  @ApiProperty({
    description: 'Quality for JPEG/WebP output (1-100)',
    required: false,
    minimum: 1,
    maximum: 100,
    example: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiProperty({
    description: 'Remove background using AI (ONNX model)',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  removeBackground?: boolean;

  @ApiProperty({
    description:
      'For SVG format: use color vectorization (true) or black and white (false). Default: false (black and white)',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  colorVectorization?: boolean;
}
