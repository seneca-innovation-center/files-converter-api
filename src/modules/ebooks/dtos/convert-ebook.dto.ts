import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum EbookTargetFormat {
  PDF = 'pdf',
  HTML = 'html',
  TXT = 'txt',
}

export enum EbookSourceFormat {
  EPUB = 'epub',
  HTML = 'html',
  TXT = 'txt',
}

export class ConvertEbookDto {
  @ApiProperty({
    description: 'Target format for the converted ebook',
    enum: EbookTargetFormat,
    example: EbookTargetFormat.PDF,
  })
  @IsEnum(EbookTargetFormat)
  @IsNotEmpty()
  targetFormat: EbookTargetFormat;
}

export class CreateEbookDto {
  @ApiProperty({
    description: 'Title of the ebook',
    example: 'My Ebook',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Author of the ebook',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiProperty({
    description: 'Content of the ebook (HTML or plain text)',
    example: '<h1>Chapter 1</h1><p>Content here...</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Source format of the content',
    enum: EbookSourceFormat,
    example: EbookSourceFormat.HTML,
    required: false,
  })
  @IsEnum(EbookSourceFormat)
  @IsOptional()
  sourceFormat?: EbookSourceFormat;
}
