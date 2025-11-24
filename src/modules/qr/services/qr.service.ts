import { promises as fs } from 'fs';
import { join } from 'path';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCanvas } from 'canvas';
import * as jsbarcode from 'jsbarcode';
import * as qrcode from 'qrcode';

import { GenerateBarcodeDto } from '../dtos/generate-barcode.dto';
import { GenerateQrDto } from '../dtos/generate-qr.dto';

/**
 * Service for generating QR codes and barcodes
 */
@Injectable()
export class QrService {
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Generates a QR code
   * @param dto QR code generation parameters
   * @returns Object containing the path to the generated file
   */
  async generateQrCode(
    dto: GenerateQrDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const size = dto.size || 300;
      const color = {
        dark: dto.color || '#000000',
        light: dto.backgroundColor || '#FFFFFF',
      };
      const errorCorrectionLevel = dto.errorCorrectionLevel || 'M';

      // Generate QR code
      const qrBuffer = await qrcode.toBuffer(dto.data, {
        width: size,
        color,
        errorCorrectionLevel,
        margin: 2,
      });

      // Generate output filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `qrcode_${timestamp}_${randomString}.png`;
      const filePath = join(this.tmpDir, filename);

      // Write to temporary directory
      await fs.writeFile(filePath, qrBuffer);

      return {
        filePath,
        filename,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'QR code generation failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Generates a barcode
   * @param dto Barcode generation parameters
   * @returns Object containing the path to the generated file
   */
  async generateBarcode(
    dto: GenerateBarcodeDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const width = dto.width || 200;
      const height = dto.height || 100;
      const displayValue = dto.displayValue !== false;

      // Create canvas
      const canvas = createCanvas(width, height);

      // Generate barcode on canvas
      jsbarcode(canvas as unknown as HTMLCanvasElement, dto.data, {
        format: dto.format,
        width: 2,
        height: height - (displayValue ? 20 : 0),
        displayValue,
      });

      // Convert canvas to buffer
      const barcodeBuffer = canvas.toBuffer('image/png');

      // Generate output filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `barcode_${timestamp}_${randomString}.png`;
      const filePath = join(this.tmpDir, filename);

      // Write to temporary directory
      await fs.writeFile(filePath, barcodeBuffer);

      return {
        filePath,
        filename,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Barcode generation failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Gets the file buffer from a file path
   * @param filePath Path to the file
   * @returns File buffer
   */
  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Deletes a temporary file
   * @param filePath Path to the file to delete
   */
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
