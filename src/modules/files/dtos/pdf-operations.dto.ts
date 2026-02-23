import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class SplitPdfDto {
  @ApiProperty({
    description: 'Page number to split from (1-indexed)',
    required: false,
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  splitFrom?: number;

  @ApiProperty({
    description: 'Page number to split to (1-indexed)',
    required: false,
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  splitTo?: number;

  @ApiProperty({
    description: 'Split at specific page numbers (comma-separated)',
    required: false,
    example: '5,10,15',
  })
  @IsString()
  @IsOptional()
  splitAt?: string;
}

export class FillPdfFormDto {
  @ApiProperty({
    description: 'Form field values as JSON string',
    example: '{"name": "John Doe", "email": "john@example.com"}',
  })
  @IsString()
  formData: string;
}
