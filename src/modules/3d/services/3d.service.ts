import { promises as fs } from 'fs';
import { join } from 'path';

import { Document, NodeIO } from '@gltf-transform/core';
import { prune, draco, weld } from '@gltf-transform/functions';
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Convert3DDto, ThreeDFormat } from '../dtos/convert-3d.dto';

/**
 * Service for handling 3D model conversion and optimization operations.
 * Uses @gltf-transform for GLB/GLTF conversions and optimizations.
 */
@Injectable()
export class ThreeDService {
  private readonly tmpDir: string;

  /**
   * Creates an instance of ThreeDService.
   * @param configService Service for accessing configuration values
   */
  constructor(private readonly configService: ConfigService) {
    // Use /tmp directory for temporary files
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Detects the format of a 3D model file based on its content and extension.
   * @param fileBuffer The file buffer
   * @param filename Original filename
   * @returns Detected format ('glb', 'gltf', 'obj', or null)
   */
  private detectFormat(fileBuffer: Buffer, filename: string): string | null {
    const ext = filename.toLowerCase().split('.').pop();

    // Check GLB format (starts with 'glTF' magic number)
    if (fileBuffer.length >= 4) {
      const magic = fileBuffer.toString('utf8', 0, 4);
      if (magic === 'glTF') {
        return 'glb';
      }
    }

    // Check by extension
    if (ext === 'glb' || ext === 'gltf') {
      return ext;
    }
    if (ext === 'obj') {
      return 'obj';
    }

    return null;
  }

  /**
   * Converts a 3D model to the specified format with optional optimization.
   * @param fileBuffer The 3D model file buffer
   * @param originalFilename Original filename for format detection
   * @param dto Conversion parameters (format, optimization options)
   * @returns Object containing the path to the converted file and metadata
   */
  async convert3DModel(
    fileBuffer: Buffer,
    originalFilename: string,
    dto: Convert3DDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      const detectedFormat = this.detectFormat(fileBuffer, originalFilename);

      if (
        !detectedFormat &&
        !originalFilename.toLowerCase().endsWith('.glb') &&
        !originalFilename.toLowerCase().endsWith('.gltf') &&
        !originalFilename.toLowerCase().endsWith('.obj')
      ) {
        throw new BadRequestException(
          'Unsupported 3D model format. Supported formats: GLB, GLTF, OBJ',
        );
      }

      const io = new NodeIO();
      let document: Document;

      // Read the input file
      if (
        detectedFormat === 'glb' ||
        originalFilename.toLowerCase().endsWith('.glb')
      ) {
        document = await io.readBinary(fileBuffer);
      } else if (
        detectedFormat === 'gltf' ||
        originalFilename.toLowerCase().endsWith('.gltf')
      ) {
        // Parse GLTF text file (JSON format) and convert to Document
        const jsonContent = JSON.parse(fileBuffer.toString('utf8'));
        const jsonDoc = { json: jsonContent, resources: {} };
        document = await io.readJSON(jsonDoc);
      } else if (
        detectedFormat === 'obj' ||
        originalFilename.toLowerCase().endsWith('.obj')
      ) {
        // For OBJ files, we need to convert to GLTF first, then to target format
        // Note: gltf-transform doesn't directly support OBJ, so we'll need to handle this differently
        // For now, we'll throw an error and handle OBJ separately
        throw new BadRequestException(
          'OBJ to GLB conversion requires intermediate processing. Please convert OBJ to GLB first.',
        );
      } else {
        throw new BadRequestException('Unable to detect 3D model format');
      }

      // Apply optimizations if requested
      if (dto.optimize || dto.compress) {
        const transforms = [prune()];

        if (dto.compress && dto.format === ThreeDFormat.GLB) {
          transforms.push(draco());
        }

        transforms.push(weld());

        await document.transform(...transforms);
      }

      // Convert to target format
      let outputBuffer: Buffer;
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      let filename: string;
      let mimeType: string;

      switch (dto.format) {
        case ThreeDFormat.GLB:
          outputBuffer = Buffer.from(await io.writeBinary(document));
          filename = `converted_${timestamp}_${randomString}.glb`;
          mimeType = 'model/gltf-binary';
          break;

        case ThreeDFormat.OBJ:
          // Convert GLTF/GLB to OBJ
          // Note: gltf-transform doesn't have direct OBJ export, so we'll need to use a different approach
          // For now, we'll convert to GLTF text and then parse it
          // This is a simplified approach - in production, you might want to use a dedicated converter
          throw new BadRequestException(
            'OBJ export is not yet fully supported. Please use GLB format.',
          );

        case ThreeDFormat.USDZ:
          // USDZ conversion requires additional processing
          // gltf-transform doesn't directly support USDZ, so this would need a custom implementation
          throw new BadRequestException(
            'USDZ conversion requires additional dependencies. Please use GLB format for now.',
          );

        default:
          throw new BadRequestException(
            `Unsupported target format: ${String(dto.format)}`,
          );
      }

      const filePath = join(this.tmpDir, filename);
      await fs.writeFile(filePath, outputBuffer);

      return {
        filePath,
        filename,
        mimeType,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        '3D model conversion failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Gets the file buffer from a file path.
   * @param filePath Path to the file
   * @returns File buffer
   */
  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Deletes a temporary file.
   * @param filePath Path to the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
