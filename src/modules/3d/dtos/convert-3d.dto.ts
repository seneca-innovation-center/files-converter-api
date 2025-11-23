import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

/**
 * Supported 3D model output formats for conversion
 */
export enum ThreeDFormat {
  GLB = 'glb',
  OBJ = 'obj',
  USDZ = 'usdz',
}

/**
 * DTO for 3D model conversion request
 */
export class Convert3DDto {
  @ApiProperty({
    description: 'Target format for the converted 3D model',
    enum: ThreeDFormat,
    example: ThreeDFormat.GLB,
  })
  @IsEnum(ThreeDFormat)
  format: ThreeDFormat;

  @ApiProperty({
    description: 'Apply optimization (prune, draco compression, weld)',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  optimize?: boolean;

  @ApiProperty({
    description: 'Apply Draco compression for GLB files',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;
}
