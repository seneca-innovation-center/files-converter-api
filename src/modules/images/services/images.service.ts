/* eslint-disable @typescript-eslint/no-require-imports */
import { promises as fs } from 'fs';
import { join } from 'path';

import { removeBackground } from '@imgly/background-removal-node';
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

import { ConvertImageDto, ImageFormat } from '../dtos/convert-image.dto';

const ImageTracer = require('imagetracerjs');
const potrace = require('potrace');

/**
 * Service for handling image conversion, resizing, and background removal operations.
 * Uses Sharp for format conversion and resizing, and @imgly/background-removal-node for AI background removal.
 */
@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly tmpDir: string;

  /**
   * Creates an instance of ImagesService.
   * @param configService Service for accessing configuration values
   */
  constructor(private readonly configService: ConfigService) {
    // Use /tmp directory for temporary files (works on Unix-like systems and Windows)
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Converts an image to the specified format with optional resizing and background removal.
   * @param fileBuffer The image file buffer
   * @param originalFilename Original filename for extension detection
   * @param dto Conversion parameters (format, dimensions, quality, background removal)
   * @returns Object containing the path to the converted file and metadata
   */
  async convertImage(
    fileBuffer: Buffer,
    originalFilename: string,
    dto: ConvertImageDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      // Validate that the input is a valid image
      const metadata = await sharp(fileBuffer).metadata();
      if (!metadata.format) {
        throw new BadRequestException('Invalid image file format');
      }

      this.logger.log(
        `Input image: ${metadata.format} ${metadata.width}x${metadata.height}`,
      );

      let processedBuffer = fileBuffer;

      // Remove background if requested
      if (dto.removeBackground) {
        this.logger.log('Applying background removal');
        try {
          // Convert buffer to PNG format first (background removal library works best with PNG)
          const pngBuffer = await sharp(processedBuffer).png().toBuffer();

          // Create a temporary file for background removal
          const tempInputPath = join(
            this.tmpDir,
            `temp_input_${Date.now()}.png`,
          );
          await fs.writeFile(tempInputPath, pngBuffer);

          this.logger.debug('Calling removeBackground with file path');
          const blobResult = await removeBackground(tempInputPath);

          // Clean up temp file
          await fs.unlink(tempInputPath).catch(() => {
            // Ignore errors
          });

          // Convert result to Buffer (handles Blob, Uint8Array, Buffer, etc.)
          if (blobResult instanceof Buffer) {
            processedBuffer = blobResult;
          } else if (
            typeof Blob !== 'undefined' &&
            blobResult instanceof Blob
          ) {
            const arrayBuffer = await blobResult.arrayBuffer();
            processedBuffer = Buffer.from(arrayBuffer);
          } else if (blobResult instanceof Uint8Array) {
            processedBuffer = Buffer.from(blobResult);
          } else {
            // Fallback: try to convert to Buffer (handle ArrayBuffer or other types)
            const arrayBuffer =
              blobResult instanceof ArrayBuffer
                ? blobResult
                : (blobResult as unknown as ArrayBuffer);
            processedBuffer = Buffer.from(arrayBuffer);
          }
          this.logger.debug(
            `Background removal complete, buffer size: ${processedBuffer.length}`,
          );
        } catch (error) {
          this.logger.error(
            'Background removal failed',
            (error as Error).stack,
          );
          throw new InternalServerErrorException(
            'Failed to remove background: ' + (error as Error).message,
          );
        }
      }

      // Create Sharp instance with the processed buffer
      let sharpInstance = sharp(processedBuffer);

      // Apply resizing if dimensions are provided
      if (dto.width || dto.height) {
        const resizeOptions: sharp.ResizeOptions = {
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true, // Don't enlarge smaller images
        };

        if (dto.width && dto.height) {
          resizeOptions.width = dto.width;
          resizeOptions.height = dto.height;
        } else if (dto.width) {
          resizeOptions.width = dto.width;
        } else if (dto.height) {
          resizeOptions.height = dto.height;
        }

        sharpInstance = sharpInstance.resize(resizeOptions);
      }

      // Convert to target format
      const formatOptions: { quality?: number } = {};
      if (
        dto.quality &&
        (dto.format === ImageFormat.JPEG || dto.format === ImageFormat.WEBP)
      ) {
        formatOptions.quality = dto.quality;
      }

      // Apply format conversion
      switch (dto.format) {
        case ImageFormat.JPEG:
          sharpInstance = sharpInstance.jpeg(formatOptions);
          break;
        case ImageFormat.PNG:
          sharpInstance = sharpInstance.png();
          break;
        case ImageFormat.WEBP:
          sharpInstance = sharpInstance.webp(formatOptions);
          break;
        case ImageFormat.AVIF:
          sharpInstance = sharpInstance.avif(formatOptions);
          break;
        case ImageFormat.TIFF:
          sharpInstance = sharpInstance.tiff();
          break;
        case ImageFormat.BMP:
          // Sharp doesn't support BMP directly, convert to PNG first then handle BMP separately
          // For now, we'll convert BMP requests to PNG
          sharpInstance = sharpInstance.png();
          break;
        case ImageFormat.SVG:
          // SVG conversion requires special handling via potrace
          // We'll process this separately below
          break;
        default:
          throw new BadRequestException(
            `Unsupported format: ${String(dto.format)}`,
          );
      }

      let convertedBuffer: Buffer;

      // Special handling for SVG conversion (image tracing)
      if (dto.format === ImageFormat.SVG) {
        convertedBuffer = await this.convertToSvg(
          sharpInstance,
          processedBuffer,
          dto.colorVectorization || false,
        );
      } else {
        // Convert to buffer for other formats
        convertedBuffer = await sharpInstance.toBuffer();
      }

      this.logger.log(
        `Conversion complete: ${dto.format}, size: ${convertedBuffer.length}`,
      );

      // Validate output buffer is not empty
      if (convertedBuffer.length === 0) {
        throw new InternalServerErrorException(
          'Conversion produced an empty image',
        );
      }

      // Generate output filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      // Map format to file extension
      const extensionMap: Record<ImageFormat, string> = {
        [ImageFormat.JPEG]: 'jpg',
        [ImageFormat.PNG]: 'png',
        [ImageFormat.WEBP]: 'webp',
        [ImageFormat.AVIF]: 'avif',
        [ImageFormat.TIFF]: 'tiff',
        [ImageFormat.BMP]: 'bmp',
        [ImageFormat.SVG]: 'svg',
      };
      const extension = extensionMap[dto.format] || 'png';
      const filename = `converted_${timestamp}_${randomString}.${extension}`;
      const filePath = join(this.tmpDir, filename);

      // Write to temporary directory
      await fs.writeFile(filePath, convertedBuffer);

      // Verify the written file is valid by reading it back (skip for SVG)
      if (dto.format !== ImageFormat.SVG) {
        const verifyMetadata = await sharp(convertedBuffer).metadata();
        this.logger.debug(
          `Output: ${verifyMetadata.format} ${verifyMetadata.width}x${verifyMetadata.height}`,
        );
      } else {
        this.logger.debug(`SVG output: ${convertedBuffer.length} bytes`);
      }

      // Determine MIME type
      const mimeTypes: Record<ImageFormat, string> = {
        [ImageFormat.JPEG]: 'image/jpeg',
        [ImageFormat.PNG]: 'image/png',
        [ImageFormat.WEBP]: 'image/webp',
        [ImageFormat.AVIF]: 'image/avif',
        [ImageFormat.TIFF]: 'image/tiff',
        [ImageFormat.BMP]: 'image/bmp',
        [ImageFormat.SVG]: 'image/svg+xml',
      };

      return {
        filePath,
        filename,
        mimeType: mimeTypes[dto.format],
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Image conversion failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Converts an image to SVG format using image tracing.
   * Supports both black-and-white (potrace) and color (imagetracerjs) vectorization.
   * @param sharpInstance Sharp instance with applied transformations
   * @param _originalBuffer Original buffer for fallback
   * @param useColorVectorization If true, uses color vectorization; if false, uses black and white
   * @returns SVG buffer
   */
  private async convertToSvg(
    sharpInstance: sharp.Sharp,
    _originalBuffer: Buffer,
    useColorVectorization: boolean,
  ): Promise<Buffer> {
    if (useColorVectorization) {
      // Use imagetracerjs for color vectorization
      return this.convertToSvgColor(sharpInstance);
    } else {
      // Use potrace for black and white vectorization
      return this.convertToSvgBw(sharpInstance);
    }
  }

  /**
   * Converts an image to SVG using potrace (black and white vectorization).
   * @param sharpInstance Sharp instance with applied transformations
   * @returns SVG buffer
   */
  private async convertToSvgBw(sharpInstance: sharp.Sharp): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // First, convert to PNG for potrace processing
      sharpInstance
        .png()
        .toBuffer()
        .then((pngBuffer) => {
          // Trace the image to SVG using potrace (black and white)
          potrace.trace(pngBuffer, (err: Error | null, svg: string) => {
            if (err) {
              reject(
                new InternalServerErrorException(
                  'SVG tracing failed: ' + err.message,
                ),
              );
            } else {
              resolve(Buffer.from(svg));
            }
          });
        })
        .catch((error) => {
          reject(
            new InternalServerErrorException(
              'Failed to prepare image for SVG conversion: ' + error.message,
            ),
          );
        });
    });
  }

  /**
   * Converts an image to SVG using imagetracerjs (color vectorization).
   * @param sharpInstance Sharp instance with applied transformations
   * @returns SVG buffer
   */
  private async convertToSvgColor(sharpInstance: sharp.Sharp): Promise<Buffer> {
    try {
      // Convert to raw RGBA buffer for ImageData format
      // ImageData needs RGBA values as a Uint8ClampedArray
      const rawBuffer = await sharpInstance
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Convert buffer to ImageData format (RGBA array)
      // ImageData expects a Uint8ClampedArray with RGBA values
      const imageData: {
        width: number;
        height: number;
        data: Uint8ClampedArray;
      } = {
        width: rawBuffer.info.width,
        height: rawBuffer.info.height,
        data: new Uint8ClampedArray(rawBuffer.data),
      };

      // Vectorize with color preservation
      const options = {
        colorsampling: 2, // Color sampling: 0=no, 1=random, 2=dominant
        numberofcolors: 256, // Number of colors to use
        colorquantcycles: 3, // Color quantization cycles
        minpathsegments: 1, // Minimum path segments
        ltres: 1, // Line threshold
        qtres: 1, // Quadratic threshold
        pathomit: 0, // Path omit
        rightangleenhance: true, // Right angle enhancement
        blurradius: 0, // Blur radius
        blurdelta: 20, // Blur delta
        strokewidth: 0, // Stroke width
        linefilter: false, // Line filter
        scale: 1, // Scale
        roundcoords: 1, // Round coordinates
        viewbox: true, // Include viewBox
        desc: false, // Include description
        lcpr: 0, // Line compare precision
        qcpr: 0, // Quadratic compare precision
      };

      // imagetracerjs converts ImageData to SVG
      const svgString = ImageTracer.imagedataToSVG(
        imageData,
        options,
      ) as string;

      return Buffer.from(svgString, 'utf-8');
    } catch (error) {
      throw new InternalServerErrorException(
        'Color SVG vectorization failed: ' + (error as Error).message,
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
