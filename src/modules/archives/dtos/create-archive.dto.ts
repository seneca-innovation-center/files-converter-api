import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Supported archive formats
 */
export enum ArchiveFormat {
  ZIP = 'zip',
  TAR = 'tar',
  TAR_GZ = 'tar.gz',
}

/**
 * DTO for archive creation request
 */
export class CreateArchiveDto {
  @ApiProperty({
    description: 'Target archive format',
    enum: ArchiveFormat,
    default: ArchiveFormat.ZIP,
  })
  @IsEnum(ArchiveFormat)
  format: ArchiveFormat;

  @ApiProperty({
    description: 'Compression level (0-9, ZIP only)',
    required: false,
    default: 6,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  compressionLevel?: number;
}
