import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * Supported OCR languages
 */
export enum OcrLanguage {
  ENGLISH = 'eng',
  FRENCH = 'fra',
  GERMAN = 'deu',
  SPANISH = 'spa',
  ITALIAN = 'ita',
  PORTUGUESE = 'por',
  RUSSIAN = 'rus',
  CHINESE_SIMPLIFIED = 'chi_sim',
  JAPANESE = 'jpn',
  KOREAN = 'kor',
  ARABIC = 'ara',
}

/**
 * DTO for OCR text extraction request
 */
export class ExtractTextDto {
  @ApiProperty({
    description: 'OCR language',
    enum: OcrLanguage,
    required: false,
    default: OcrLanguage.ENGLISH,
  })
  @IsOptional()
  @IsEnum(OcrLanguage)
  language?: OcrLanguage;

  @ApiProperty({
    description: 'Output format (txt, pdf, json)',
    required: false,
    default: 'txt',
    enum: ['txt', 'pdf', 'json'],
  })
  @IsOptional()
  @IsString()
  outputFormat?: string;
}
