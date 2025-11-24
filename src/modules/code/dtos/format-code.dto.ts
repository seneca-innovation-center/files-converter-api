import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * Supported programming languages
 */
export enum CodeLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  JAVA = 'java',
  CSHARP = 'csharp',
  CPP = 'cpp',
  GO = 'go',
  RUST = 'rust',
  PHP = 'php',
  RUBY = 'ruby',
  HTML = 'html',
  CSS = 'css',
  JSON = 'json',
  SQL = 'sql',
}

/**
 * DTO for code formatting request
 */
export class FormatCodeDto {
  @ApiProperty({
    description: 'Programming language',
    enum: CodeLanguage,
    required: false,
  })
  @IsOptional()
  @IsEnum(CodeLanguage)
  language?: CodeLanguage;

  @ApiProperty({
    description: 'Output format (formatted, html)',
    required: false,
    default: 'formatted',
    enum: ['formatted', 'html'],
  })
  @IsOptional()
  @IsString()
  outputFormat?: string;
}
