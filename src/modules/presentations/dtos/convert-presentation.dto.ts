import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PresentationTargetFormat {
  PDF = 'pdf',
  PNG = 'png',
  JPEG = 'jpeg',
}

export class ConvertPresentationDto {
  @ApiProperty({
    description: 'Target format for the converted presentation',
    enum: PresentationTargetFormat,
    example: PresentationTargetFormat.PDF,
  })
  @IsEnum(PresentationTargetFormat)
  @IsNotEmpty()
  targetFormat: PresentationTargetFormat;
}
