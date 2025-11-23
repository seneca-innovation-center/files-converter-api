import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for general file conversion request
 */
export class ConvertFileDto {
  @ApiProperty({
    description: 'Target format/extension for the converted file',
    example: 'pdf',
  })
  @IsString()
  @IsNotEmpty()
  targetFormat: string;

  @ApiProperty({
    description: 'Additional conversion options (format-specific, JSON string)',
    required: false,
    example: '{}',
  })
  @IsOptional()
  @IsString()
  options?: string;
}
