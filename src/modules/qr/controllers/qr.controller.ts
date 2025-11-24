import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

import { GenerateBarcodeDto } from '../dtos/generate-barcode.dto';
import { GenerateQrDto } from '../dtos/generate-qr.dto';
import { QrService } from '../services/qr.service';

/**
 * Controller for QR code and barcode generation endpoints
 */
@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  /**
   * Generates a QR code
   * @param dto QR code parameters
   * @param reply Fastify reply object
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate QR code',
    description:
      'Generate a QR code from text or URL with customizable size and colors',
  })
  @ApiBody({ type: GenerateQrDto })
  async generateQrCode(
    @Body() dto: GenerateQrDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.qrService.generateQrCode(dto);
    const buffer = await this.qrService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    // Clean up temporary file
    this.qrService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }

  /**
   * Generates a barcode
   * @param dto Barcode parameters
   * @param reply Fastify reply object
   */
  @Post('barcode')
  @ApiOperation({
    summary: 'Generate barcode',
    description:
      'Generate a barcode in various formats (CODE128, EAN13, UPC, etc.)',
  })
  @ApiBody({ type: GenerateBarcodeDto })
  async generateBarcode(
    @Body() dto: GenerateBarcodeDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.qrService.generateBarcode(dto);
    const buffer = await this.qrService.getFileBuffer(result.filePath);

    reply.header('Content-Type', result.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    reply.header('Content-Length', buffer.length.toString());

    await reply.send(buffer);

    // Clean up temporary file
    this.qrService.deleteFile(result.filePath).catch(() => {
      // Ignore cleanup errors
    });
  }
}
