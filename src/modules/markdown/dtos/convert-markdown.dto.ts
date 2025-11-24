import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';

/**
 * Supported markdown conversion formats
 */
export enum MarkdownFormat {
  HTML = 'html',
  PDF = 'pdf',
}

/**
 * DTO for markdown conversion request
 */
export class ConvertMarkdownDto {
  @ApiProperty({
    description: 'Target format for conversion',
    enum: MarkdownFormat,
    example: MarkdownFormat.HTML,
  })
  @IsEnum(MarkdownFormat)
  @IsNotEmpty()
  targetFormat: MarkdownFormat;
}
