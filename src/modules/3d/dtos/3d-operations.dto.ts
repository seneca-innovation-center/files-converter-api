import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ExtractType {
  TEXTURES = 'textures',
  ANIMATIONS = 'animations',
  MATERIALS = 'materials',
}

export class Extract3DDataDto {
  @ApiProperty({
    description: 'Type of data to extract',
    enum: ExtractType,
    example: ExtractType.TEXTURES,
  })
  @IsEnum(ExtractType)
  @IsNotEmpty()
  extractType: ExtractType;
}
