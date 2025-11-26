import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';

import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, draco, weld } from '@gltf-transform/functions';
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';

import { Extract3DDataDto, ExtractType } from '../dtos/3d-operations.dto';
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

      // Load Draco module for compression/decompression support
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dracoModule = require('draco3dgltf');

      // Create NodeIO with all extensions registered and Draco decoder/encoder
      const io = new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({
          'draco3d.decoder': await dracoModule.createDecoderModule(),
          'draco3d.encoder': await dracoModule.createEncoderModule(),
        });
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
          // Apply Draco compression (encoder is already registered with NodeIO)
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

        case ThreeDFormat.GLTF: {
          // Export as GLTF (JSON format)
          const jsonDoc = await io.writeJSON(document);
          outputBuffer = Buffer.from(JSON.stringify(jsonDoc.json, null, 2));
          filename = `converted_${timestamp}_${randomString}.gltf`;
          mimeType = 'model/gltf+json';
          break;
        }

        case ThreeDFormat.OBJ:
          // Convert GLTF/GLB to OBJ by extracting mesh data
          outputBuffer = await this.convertToObj(document);
          filename = `converted_${timestamp}_${randomString}.obj`;
          mimeType = 'model/obj';
          break;

        case ThreeDFormat.USDZ: {
          // Convert GLTF/GLB to USDZ (USD in a ZIP archive)
          const usdzPath = await this.convertToUsdz(
            document,
            timestamp,
            randomString,
          );
          const usdzBuffer = await fs.readFile(usdzPath);
          await fs.unlink(usdzPath); // Clean up temp file
          outputBuffer = usdzBuffer;
          filename = `converted_${timestamp}_${randomString}.usdz`;
          mimeType = 'model/vnd.usdz+zip';
          break;
        }

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
   * Converts a GLTF document to OBJ format
   * @param document GLTF document
   * @returns OBJ file buffer
   */
  private async convertToObj(document: Document): Promise<Buffer> {
    let objContent = '# Converted from GLTF/GLB\n';
    let vertexOffset = 0; // Track total vertices written
    let texcoordOffset = 0; // Track total texture coordinates written
    let normalOffset = 0; // Track total normals written

    // Iterate through all meshes in the document
    for (const mesh of document.getRoot().listMeshes()) {
      const meshName = mesh.getName() || 'mesh';
      objContent += `\no ${meshName}\n`;

      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        const normal = primitive.getAttribute('NORMAL');
        const texcoord = primitive.getAttribute('TEXCOORD_0');
        const indices = primitive.getIndices();

        if (!position) continue;

        const positionArray = position.getArray();
        const normalArray = normal?.getArray();
        const texcoordArray = texcoord?.getArray();
        const indicesArray = indices?.getArray();

        if (!positionArray || !indicesArray) continue;

        // Write vertices
        for (let i = 0; i < positionArray.length; i += 3) {
          objContent += `v ${positionArray[i].toFixed(6)} ${positionArray[i + 1].toFixed(6)} ${positionArray[i + 2].toFixed(6)}\n`;
        }

        // Write texture coordinates
        if (texcoordArray) {
          for (let i = 0; i < texcoordArray.length; i += 2) {
            objContent += `vt ${texcoordArray[i].toFixed(6)} ${texcoordArray[i + 1].toFixed(6)}\n`;
          }
        }

        // Write normals
        if (normalArray) {
          for (let i = 0; i < normalArray.length; i += 3) {
            objContent += `vn ${normalArray[i].toFixed(6)} ${normalArray[i + 1].toFixed(6)} ${normalArray[i + 2].toFixed(6)}\n`;
          }
        }

        // Write faces with proper offsetting
        // OBJ indices start at 1, so we add 1 to the offset
        for (let i = 0; i < indicesArray.length; i += 3) {
          const idx1 = indicesArray[i];
          const idx2 = indicesArray[i + 1];
          const idx3 = indicesArray[i + 2];

          // Calculate actual OBJ indices (1-based, with offsets)
          const v1 = idx1 + vertexOffset + 1;
          const v2 = idx2 + vertexOffset + 1;
          const v3 = idx3 + vertexOffset + 1;

          if (texcoordArray && normalArray) {
            // Format: f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
            const vt1 = idx1 + texcoordOffset + 1;
            const vt2 = idx2 + texcoordOffset + 1;
            const vt3 = idx3 + texcoordOffset + 1;
            const vn1 = idx1 + normalOffset + 1;
            const vn2 = idx2 + normalOffset + 1;
            const vn3 = idx3 + normalOffset + 1;
            objContent += `f ${v1}/${vt1}/${vn1} ${v2}/${vt2}/${vn2} ${v3}/${vt3}/${vn3}\n`;
          } else if (normalArray) {
            // Format: f v1//vn1 v2//vn2 v3//vn3
            const vn1 = idx1 + normalOffset + 1;
            const vn2 = idx2 + normalOffset + 1;
            const vn3 = idx3 + normalOffset + 1;
            objContent += `f ${v1}//${vn1} ${v2}//${vn2} ${v3}//${vn3}\n`;
          } else if (texcoordArray) {
            // Format: f v1/vt1 v2/vt2 v3/vt3
            const vt1 = idx1 + texcoordOffset + 1;
            const vt2 = idx2 + texcoordOffset + 1;
            const vt3 = idx3 + texcoordOffset + 1;
            objContent += `f ${v1}/${vt1} ${v2}/${vt2} ${v3}/${vt3}\n`;
          } else {
            // Format: f v1 v2 v3
            objContent += `f ${v1} ${v2} ${v3}\n`;
          }
        }

        // Update offsets for next primitive
        vertexOffset += positionArray.length / 3;
        if (texcoordArray) {
          texcoordOffset += texcoordArray.length / 2;
        }
        if (normalArray) {
          normalOffset += normalArray.length / 3;
        }
      }
    }

    return Buffer.from(objContent, 'utf-8');
  }

  /**
   * Converts a GLTF document to USDZ format
   * @param document GLTF document
   * @param timestamp Timestamp for unique filename
   * @param randomString Random string for unique filename
   * @returns Path to the created USDZ file
   */
  private async convertToUsdz(
    document: Document,
    timestamp: number,
    randomString: string,
  ): Promise<string> {
    // Create USDA (USD ASCII) content
    let usdaContent = `#usda 1.0
(
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root"
{
`;

    let meshIndex = 0;
    // Extract mesh data and create USD geometry
    for (const mesh of document.getRoot().listMeshes()) {
      const meshBaseName = mesh.getName() || `Mesh_${meshIndex}`;

      let primitiveIndex = 0;
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        const normal = primitive.getAttribute('NORMAL');
        const texcoord = primitive.getAttribute('TEXCOORD_0');
        const indices = primitive.getIndices();

        if (!position) continue;

        const positionArray = position.getArray();
        const normalArray = normal?.getArray();
        const texcoordArray = texcoord?.getArray();
        const indicesArray = indices?.getArray();

        if (!positionArray || !indicesArray) continue;

        // Create unique mesh name for each primitive
        const meshName = `${meshBaseName}_${primitiveIndex}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_',
        );

        usdaContent += `    def Mesh "${meshName}"\n    {\n`;

        // Subdivision scheme
        usdaContent += '        uniform token subdivisionScheme = "none"\n';

        // Write points (vertices)
        usdaContent += '        point3f[] points = [\n';
        for (let i = 0; i < positionArray.length; i += 3) {
          const x = positionArray[i].toFixed(6);
          const y = positionArray[i + 1].toFixed(6);
          const z = positionArray[i + 2].toFixed(6);
          usdaContent += `            (${x}, ${y}, ${z})${i + 3 < positionArray.length ? ',' : ''}\n`;
        }
        usdaContent += '        ]\n';

        // Write normals if available
        if (normalArray && normalArray.length > 0) {
          usdaContent += '        normal3f[] normals = [\n';
          for (let i = 0; i < normalArray.length; i += 3) {
            const x = normalArray[i].toFixed(6);
            const y = normalArray[i + 1].toFixed(6);
            const z = normalArray[i + 2].toFixed(6);
            usdaContent += `            (${x}, ${y}, ${z})${i + 3 < normalArray.length ? ',' : ''}\n`;
          }
          usdaContent += '        ] (\n';
          usdaContent += '            interpolation = "vertex"\n';
          usdaContent += '        )\n';
        }

        // Write texture coordinates if available
        if (texcoordArray && texcoordArray.length > 0) {
          usdaContent += '        float2[] primvars:st = [\n';
          for (let i = 0; i < texcoordArray.length; i += 2) {
            const u = texcoordArray[i].toFixed(6);
            const v = texcoordArray[i + 1].toFixed(6);
            usdaContent += `            (${u}, ${v})${i + 2 < texcoordArray.length ? ',' : ''}\n`;
          }
          usdaContent += '        ] (\n';
          usdaContent += '            interpolation = "vertex"\n';
          usdaContent += '        )\n';
        }

        // Write face vertex counts (triangles = 3 vertices each)
        const faceCount = Math.floor(indicesArray.length / 3);
        usdaContent += '        int[] faceVertexCounts = [';
        const counts = Array(faceCount).fill(3);
        usdaContent += counts.join(', ');
        usdaContent += ']\n';

        // Write face vertex indices
        usdaContent += '        int[] faceVertexIndices = [\n';
        for (let i = 0; i < indicesArray.length; i += 30) {
          usdaContent += '            ';
          const end = Math.min(i + 30, indicesArray.length);
          for (let j = i; j < end; j++) {
            usdaContent += `${indicesArray[j]}${j < indicesArray.length - 1 ? ', ' : ''}`;
          }
          usdaContent += '\n';
        }
        usdaContent += '        ]\n';

        usdaContent += '    }\n\n';
        primitiveIndex++;
      }

      meshIndex++;
    }

    usdaContent += '}\n';

    // Create temporary USDA file
    const usdaFilename = `model_${timestamp}_${randomString}.usda`;
    const usdaPath = join(this.tmpDir, usdaFilename);
    await fs.writeFile(usdaPath, usdaContent);

    // Create USDZ (ZIP archive containing the USDA file)
    const usdzFilename = `model_${timestamp}_${randomString}.usdz`;
    const usdzPath = join(this.tmpDir, usdzFilename);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(usdzPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Add the USDA file to the archive
      archive.file(usdaPath, { name: 'model.usda' });

      void archive.finalize();
    });

    // Clean up temporary USDA file
    await fs.unlink(usdaPath);

    return usdzPath;
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
   * Extracts textures, animations, or materials from 3D model
   */
  async extract3DData(
    fileBuffer: Buffer,
    originalFilename: string,
    dto: Extract3DDataDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    try {
      // Load Draco module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dracoModule = require('draco3dgltf');

      // Create NodeIO with extensions
      const io = new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({
          'draco3d.decoder': await dracoModule.createDecoderModule(),
          'draco3d.encoder': await dracoModule.createEncoderModule(),
        });

      // Read document
      let document: Document;

      if (originalFilename.toLowerCase().endsWith('.glb')) {
        document = await io.readBinary(fileBuffer);
      } else if (originalFilename.toLowerCase().endsWith('.gltf')) {
        const jsonContent = JSON.parse(fileBuffer.toString('utf8'));
        const jsonDoc = { json: jsonContent, resources: {} };
        document = await io.readJSON(jsonDoc);
      } else {
        throw new BadRequestException(
          'Only GLB/GLTF files are supported for extraction',
        );
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);

      if (dto.extractType === ExtractType.TEXTURES) {
        // Extract texture information
        // Note: Full texture extraction (binary data) requires parsing GLB binary structure
        // For now, we extract texture metadata and URIs
        const root = document.getRoot();
        const textureInfo: Array<{
          name: string;
          uri: string | null;
          mimeType: string;
        }> = [];

        // Get all textures and their images
        for (const texture of root.listTextures()) {
          const image = texture.getImage();
          if (image) {
            // In gltf-transform, image is a Uint8Array representing the image data
            // URI and MIME type are stored separately - we'll extract what we can
            // For full metadata, we'd need to parse the original GLTF JSON
            const textureName =
              texture.getName() || `texture_${textureInfo.length}`;
            textureInfo.push({
              name: textureName,
              uri: null, // URI would need to be extracted from original GLTF JSON
              mimeType: 'image/png', // Default, actual MIME type would need parsing
            });
          }
        }

        if (textureInfo.length === 0) {
          throw new BadRequestException('No textures found in the model');
        }

        // Export texture metadata as JSON
        // Note: For actual texture binary extraction, you'd need to parse the GLB file
        // and extract embedded binary data, which requires additional libraries
        const filename = `textures_${timestamp}_${randomString}.json`;
        const filePath = join(this.tmpDir, filename);
        await fs.writeFile(
          filePath,
          JSON.stringify(
            {
              textures: textureInfo,
              note: 'This is texture metadata. For binary texture extraction, use specialized GLB parsing tools.',
            },
            null,
            2,
          ),
        );

        return {
          filePath,
          filename,
          mimeType: 'application/json',
        };
      } else if (dto.extractType === ExtractType.ANIMATIONS) {
        // Extract animations
        const root = document.getRoot();
        const animations = root.listAnimations();

        if (animations.length === 0) {
          throw new BadRequestException('No animations found in the model');
        }

        // Export animations as JSON
        const animationData = animations.map((anim, index) => {
          const channels = anim.listChannels();
          const samplers = anim.listSamplers();
          return {
            name: anim.getName() || `Animation_${index}`,
            channels: channels.length,
            samplers: samplers.length,
          };
        });

        const filename = `animations_${timestamp}_${randomString}.json`;
        const filePath = join(this.tmpDir, filename);
        await fs.writeFile(filePath, JSON.stringify(animationData, null, 2));

        return {
          filePath,
          filename,
          mimeType: 'application/json',
        };
      } else if (dto.extractType === ExtractType.MATERIALS) {
        // Extract materials
        const root = document.getRoot();
        const materials = root.listMaterials();

        if (materials.length === 0) {
          throw new BadRequestException('No materials found in the model');
        }

        // Export materials as JSON
        const materialData = materials.map((mat, index) => {
          const baseColor = mat.getBaseColorFactor();
          const metallic = mat.getMetallicFactor();
          const roughness = mat.getRoughnessFactor();
          return {
            name: mat.getName() || `Material_${index}`,
            baseColor: baseColor ? Array.from(baseColor) : null,
            metallic,
            roughness,
            hasBaseColorTexture: mat.getBaseColorTexture() !== null,
            hasMetallicRoughnessTexture:
              mat.getMetallicRoughnessTexture() !== null,
            hasNormalTexture: mat.getNormalTexture() !== null,
          };
        });

        const filename = `materials_${timestamp}_${randomString}.json`;
        const filePath = join(this.tmpDir, filename);
        await fs.writeFile(filePath, JSON.stringify(materialData, null, 2));

        return {
          filePath,
          filename,
          mimeType: 'application/json',
        };
      } else {
        throw new BadRequestException(
          `Unsupported extract type: ${String(dto.extractType)}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        '3D data extraction failed: ' + (error as Error).message,
      );
    }
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
