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
 * Supported barcode formats
 */
enum BarcodeFormat {
  CODE128 = 'CODE128',
  EAN13 = 'EAN13',
  EAN8 = 'EAN8',
  UPC = 'UPC',
  CODE39 = 'CODE39',
  ITF14 = 'ITF14',
  MSI = 'MSI',
  PHARMACODE = 'pharmacode',
}

/**
 * DTO for barcode generation request
 */
export class GenerateBarcodeDto {
  @ApiProperty({
    description: 'Data to encode in the barcode',
    example: '1234567890123',
  })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    description: 'Barcode format',
    enum: BarcodeFormat,
    default: BarcodeFormat.CODE128,
  })
  @IsEnum(BarcodeFormat)
  format: BarcodeFormat;

  @ApiProperty({
    description: 'Width of the barcode in pixels',
    required: false,
    default: 200,
    minimum: 100,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000)
  width?: number;

  @ApiProperty({
    description: 'Height of the barcode in pixels',
    required: false,
    default: 100,
    minimum: 50,
    maximum: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  height?: number;

  @ApiProperty({
    description: 'Display text below barcode',
    required: false,
    default: true,
  })
  @IsOptional()
  displayValue?: boolean;
}
