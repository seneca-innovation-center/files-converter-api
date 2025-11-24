import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

/**
 * Supported QR code error correction levels
 */
export enum QrErrorCorrectionLevel {
  LOW = 'L',
  MEDIUM = 'M',
  QUARTILE = 'Q',
  HIGH = 'H',
}

/**
 * DTO for QR code generation request
 */
export class GenerateQrDto {
  @ApiProperty({
    description: 'Data to encode in the QR code (text, URL, etc.)',
    example: 'https://example.com',
  })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    description: 'Size of the QR code in pixels',
    required: false,
    default: 300,
    minimum: 100,
    maximum: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  size?: number;

  @ApiProperty({
    description: 'Foreground color (hex)',
    required: false,
    default: '#000000',
    example: '#000000',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    description: 'Background color (hex)',
    required: false,
    default: '#FFFFFF',
    example: '#FFFFFF',
  })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiProperty({
    description: 'Error correction level',
    enum: QrErrorCorrectionLevel,
    required: false,
    default: QrErrorCorrectionLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(QrErrorCorrectionLevel)
  errorCorrectionLevel?: QrErrorCorrectionLevel;
}
