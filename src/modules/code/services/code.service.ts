import { promises as fs } from 'fs';
import { join } from 'path';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import hljs from 'highlight.js';
import * as prettier from 'prettier';

import { FormatCodeDto, CodeLanguage } from '../dtos/format-code.dto';

/**
 * Service for code formatting and syntax highlighting
 */
@Injectable()
export class CodeService {
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Formats and/or highlights code
   * @param fileBuffer Code file buffer
   * @param dto Formatting parameters
   * @returns Object containing the formatted code file
   */
  async formatCode(
    fileBuffer: Buffer,
    dto: FormatCodeDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const code = fileBuffer.toString('utf-8');
      const outputFormat = dto.outputFormat || 'formatted';
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);

      let outputBuffer: Buffer;
      let extension: string;
      let mimeType: string;

      if (outputFormat === 'html') {
        // Generate HTML with syntax highlighting
        const language = dto.language || CodeLanguage.JAVASCRIPT;
        const highlighted = hljs.highlightAuto(code, [language]).value;
        const html = this.generateHtmlTemplate(highlighted, language);
        outputBuffer = Buffer.from(html);
        extension = 'html';
        mimeType = 'text/html';
      } else {
        // Format the code using prettier
        const formatted = await this.formatWithPrettier(code, dto.language);
        outputBuffer = Buffer.from(formatted);
        extension = this.getExtension(dto.language);
        mimeType = 'text/plain';
      }

      const filename = `code_${timestamp}_${randomString}.${extension}`;
      const filePath = join(this.tmpDir, filename);

      await fs.writeFile(filePath, outputBuffer);

      return {
        filePath,
        filename,
        mimeType,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Code formatting failed: ' + (error as Error).message,
      );
    }
  }

  private async formatWithPrettier(
    code: string,
    language?: CodeLanguage,
  ): Promise<string> {
    try {
      const parser = this.getParser(language);
      return await prettier.format(code, { parser });
    } catch (error) {
      console.error(error);
      // If prettier fails, return original code
      return code;
    }
  }

  private getParser(language?: CodeLanguage): string {
    const parserMap: Record<CodeLanguage, string> = {
      [CodeLanguage.JAVASCRIPT]: 'babel',
      [CodeLanguage.TYPESCRIPT]: 'typescript',
      [CodeLanguage.PYTHON]: 'babel', // Fallback
      [CodeLanguage.JAVA]: 'java',
      [CodeLanguage.CSHARP]: 'babel', // Fallback
      [CodeLanguage.CPP]: 'babel', // Fallback
      [CodeLanguage.GO]: 'babel', // Fallback
      [CodeLanguage.RUST]: 'babel', // Fallback
      [CodeLanguage.PHP]: 'php',
      [CodeLanguage.RUBY]: 'babel', // Fallback
      [CodeLanguage.HTML]: 'html',
      [CodeLanguage.CSS]: 'css',
      [CodeLanguage.JSON]: 'json',
      [CodeLanguage.SQL]: 'babel', // Fallback
    };
    return parserMap[language || CodeLanguage.JAVASCRIPT] || 'babel';
  }

  private getExtension(language?: CodeLanguage): string {
    const extMap: Record<CodeLanguage, string> = {
      [CodeLanguage.JAVASCRIPT]: 'js',
      [CodeLanguage.TYPESCRIPT]: 'ts',
      [CodeLanguage.PYTHON]: 'py',
      [CodeLanguage.JAVA]: 'java',
      [CodeLanguage.CSHARP]: 'cs',
      [CodeLanguage.CPP]: 'cpp',
      [CodeLanguage.GO]: 'go',
      [CodeLanguage.RUST]: 'rs',
      [CodeLanguage.PHP]: 'php',
      [CodeLanguage.RUBY]: 'rb',
      [CodeLanguage.HTML]: 'html',
      [CodeLanguage.CSS]: 'css',
      [CodeLanguage.JSON]: 'json',
      [CodeLanguage.SQL]: 'sql',
    };
    return extMap[language || CodeLanguage.JAVASCRIPT] || 'txt';
  }

  private generateHtmlTemplate(
    highlightedCode: string,
    language: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Highlight</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #0d1117;
      color: #c9d1d9;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    pre {
      margin: 0;
      padding: 20px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-size: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <pre><code class="language-${language}">${highlightedCode}</code></pre>
</body>
</html>`;
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
