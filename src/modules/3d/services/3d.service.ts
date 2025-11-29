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

        case ThreeDFormat.STL:
          // Convert GLTF/GLB to STL (ASCII format)
          outputBuffer = await this.convertToStl(document);
          filename = `converted_${timestamp}_${randomString}.stl`;
          mimeType = 'model/stl';
          break;

        case ThreeDFormat.PLY:
          // Convert GLTF/GLB to PLY (ASCII format)
          outputBuffer = await this.convertToPly(document);
          filename = `converted_${timestamp}_${randomString}.ply`;
          mimeType = 'model/ply';
          break;

        case ThreeDFormat.FBX:
          // Convert GLTF/GLB to FBX (binary format)
          outputBuffer = await this.convertToFbx(document);
          filename = `converted_${timestamp}_${randomString}.fbx`;
          mimeType = 'application/octet-stream';
          break;

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
   * Converts a GLTF document to STL format (ASCII)
   * @param document GLTF document
   * @returns STL file buffer
   */
  private async convertToStl(document: Document): Promise<Buffer> {
    let stlContent = 'solid converted_model\n';

    // Iterate through all meshes in the document
    for (const mesh of document.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        const normal = primitive.getAttribute('NORMAL');
        const indices = primitive.getIndices();

        if (!position) continue;

        const positionArray = position.getArray();
        const normalArray = normal?.getArray();
        const indicesArray = indices?.getArray();

        if (!positionArray || !indicesArray) continue;

        // Write triangles
        for (let i = 0; i < indicesArray.length; i += 3) {
          const idx1 = indicesArray[i];
          const idx2 = indicesArray[i + 1];
          const idx3 = indicesArray[i + 2];

          // Get vertex positions
          const v1x = positionArray[idx1 * 3];
          const v1y = positionArray[idx1 * 3 + 1];
          const v1z = positionArray[idx1 * 3 + 2];

          const v2x = positionArray[idx2 * 3];
          const v2y = positionArray[idx2 * 3 + 1];
          const v2z = positionArray[idx2 * 3 + 2];

          const v3x = positionArray[idx3 * 3];
          const v3y = positionArray[idx3 * 3 + 1];
          const v3z = positionArray[idx3 * 3 + 2];

          // Calculate face normal if not available
          let nx = 0;
          let ny = 0;
          let nz = 0;

          if (normalArray) {
            // Use average of vertex normals
            nx =
              (normalArray[idx1 * 3] +
                normalArray[idx2 * 3] +
                normalArray[idx3 * 3]) /
              3;
            ny =
              (normalArray[idx1 * 3 + 1] +
                normalArray[idx2 * 3 + 1] +
                normalArray[idx3 * 3 + 1]) /
              3;
            nz =
              (normalArray[idx1 * 3 + 2] +
                normalArray[idx2 * 3 + 2] +
                normalArray[idx3 * 3 + 2]) /
              3;
          } else {
            // Calculate normal from triangle vertices
            const dx1 = v2x - v1x;
            const dy1 = v2y - v1y;
            const dz1 = v2z - v1z;
            const dx2 = v3x - v1x;
            const dy2 = v3y - v1y;
            const dz2 = v3z - v1z;

            nx = dy1 * dz2 - dz1 * dy2;
            ny = dz1 * dx2 - dx1 * dz2;
            nz = dx1 * dy2 - dy1 * dx2;

            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (length > 0) {
              nx /= length;
              ny /= length;
              nz /= length;
            }
          }

          // Write facet
          stlContent += `  facet normal ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
          stlContent += '    outer loop\n';
          stlContent += `      vertex ${v1x.toFixed(6)} ${v1y.toFixed(6)} ${v1z.toFixed(6)}\n`;
          stlContent += `      vertex ${v2x.toFixed(6)} ${v2y.toFixed(6)} ${v2z.toFixed(6)}\n`;
          stlContent += `      vertex ${v3x.toFixed(6)} ${v3y.toFixed(6)} ${v3z.toFixed(6)}\n`;
          stlContent += '    endloop\n';
          stlContent += '  endfacet\n';
        }
      }
    }

    stlContent += 'endsolid converted_model\n';

    return Buffer.from(stlContent, 'utf-8');
  }

  /**
   * Converts a GLTF document to PLY format (ASCII)
   * @param document GLTF document
   * @returns PLY file buffer
   */
  private async convertToPly(document: Document): Promise<Buffer> {
    // Collect all vertices and faces
    const vertices: Array<[number, number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const texcoords: Array<[number, number]> = [];
    const faces: number[][] = [];

    let vertexOffset = 0;

    // Iterate through all meshes
    for (const mesh of document.getRoot().listMeshes()) {
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

        // Add vertices
        for (let i = 0; i < positionArray.length; i += 3) {
          vertices.push([
            positionArray[i],
            positionArray[i + 1],
            positionArray[i + 2],
          ]);
        }

        // Add normals if available
        if (normalArray) {
          for (let i = 0; i < normalArray.length; i += 3) {
            normals.push([
              normalArray[i],
              normalArray[i + 1],
              normalArray[i + 2],
            ]);
          }
        }

        // Add texture coordinates if available
        if (texcoordArray) {
          for (let i = 0; i < texcoordArray.length; i += 2) {
            texcoords.push([texcoordArray[i], texcoordArray[i + 1]]);
          }
        }

        // Add faces with vertex offset
        for (let i = 0; i < indicesArray.length; i += 3) {
          faces.push([
            indicesArray[i] + vertexOffset,
            indicesArray[i + 1] + vertexOffset,
            indicesArray[i + 2] + vertexOffset,
          ]);
        }

        vertexOffset += positionArray.length / 3;
      }
    }

    // Build PLY header
    let plyContent = 'ply\n';
    plyContent += 'format ascii 1.0\n';
    plyContent += `element vertex ${vertices.length}\n`;
    plyContent += 'property float x\n';
    plyContent += 'property float y\n';
    plyContent += 'property float z\n';

    if (normals.length === vertices.length) {
      plyContent += 'property float nx\n';
      plyContent += 'property float ny\n';
      plyContent += 'property float nz\n';
    }

    if (texcoords.length === vertices.length) {
      plyContent += 'property float s\n';
      plyContent += 'property float t\n';
    }

    plyContent += `element face ${faces.length}\n`;
    plyContent += 'property list uchar int vertex_indices\n';
    plyContent += 'end_header\n';

    // Write vertices
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      plyContent += `${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`;

      if (normals.length === vertices.length && normals[i]) {
        const [nx, ny, nz] = normals[i];
        plyContent += ` ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`;
      }

      if (texcoords.length === vertices.length && texcoords[i]) {
        const [s, t] = texcoords[i];
        plyContent += ` ${s.toFixed(6)} ${t.toFixed(6)}`;
      }

      plyContent += '\n';
    }

    // Write faces
    for (const face of faces) {
      plyContent += `3 ${face[0]} ${face[1]} ${face[2]}\n`;
    }

    return Buffer.from(plyContent, 'utf-8');
  }

  /**
   * Converts a GLTF document to FBX format (binary)
   * Note: FBX is a complex binary format. This is a basic implementation
   * that creates a simplified FBX file with mesh data.
   * @param document GLTF document
   * @returns FBX file buffer
   */
  private async convertToFbx(document: Document): Promise<Buffer> {
    // FBX is a complex binary format. For a basic implementation,
    // we'll create an ASCII FBX file which is easier to generate
    let fbxContent = `; FBX 7.4.0 project file
; Created by Files Converter API
; ----------------------------------------------------

FBXHeaderExtension:  {
\tFBXHeaderVersion: 1003
\tFBXVersion: 7400
\tCreationTimeStamp: {
\t\tVersion: 1000
\t\tYear: ${new Date().getFullYear()}
\t\tMonth: ${new Date().getMonth() + 1}
\t\tDay: ${new Date().getDate()}
\t\tHour: ${new Date().getHours()}
\t\tMinute: ${new Date().getMinutes()}
\t\tSecond: ${new Date().getSeconds()}
\t\tMillisecond: ${new Date().getMilliseconds()}
\t}
\tCreator: "Files Converter API"
}
GlobalSettings:  {
\tVersion: 1000
\tProperties70:  {
\t\tP: "UpAxis", "int", "Integer", "",1
\t\tP: "UpAxisSign", "int", "Integer", "",1
\t\tP: "FrontAxis", "int", "Integer", "",2
\t\tP: "FrontAxisSign", "int", "Integer", "",1
\t\tP: "CoordAxis", "int", "Integer", "",0
\t\tP: "CoordAxisSign", "int", "Integer", "",1
\t\tP: "OriginalUpAxis", "int", "Integer", "",1
\t\tP: "OriginalUpAxisSign", "int", "Integer", "",1
\t\tP: "UnitScaleFactor", "double", "Number", "",1
\t}
}
Documents:  {
\tCount: 1
\tDocument: 1000 {
\t\tProperties70:  {
\t\t\tP: "SourceObject", "object", "", ""
\t\t\tP: "ActiveAnimStackName", "KString", "", "", "Take 001"
\t\t}
\t\tRootNode: 0
\t}
\tRootNode:  {
\t\tType: "Model"
\t\tVersion: 232
\t\tProperties70:  {
\t\t\tP: "RotationActive", "bool", "", "",1
\t\t\tP: "InheritType", "enum", "", "",1
\t\t\tP: "ScalingMax", "Vector3D", "Vector", "",0,0,0
\t\t\tP: "DefaultAttributeIndex", "int", "Integer", "",-1
\t\t}
\t}
}
Definitions:  {
\tVersion: 100
\tCount: 2
\tObjectType: "Model" {
\t\tCount: 1
\t}
\tObjectType: "Geometry" {
\t\tCount: 1
\t}
}
Objects:  {
`;

    let meshIndex = 0;
    let geometryIndex = 0;

    // Extract mesh data
    for (const mesh of document.getRoot().listMeshes()) {
      const meshName = mesh.getName() || `Mesh_${meshIndex}`;

      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        const normal = primitive.getAttribute('NORMAL');
        const indices = primitive.getIndices();

        if (!position) continue;

        const positionArray = position.getArray();
        const normalArray = normal?.getArray();
        const indicesArray = indices?.getArray();

        if (!positionArray || !indicesArray) continue;

        const vertexCount = positionArray.length / 3;

        // Write Model node
        fbxContent += `\tModel: ${meshIndex * 1000 + 100}, "${meshName}", "Mesh" {\n`;
        fbxContent += `\t\tVersion: 232\n`;
        fbxContent += `\t\tProperties70:  {\n`;
        fbxContent += `\t\t\tP: "RotationActive", "bool", "", "",1\n`;
        fbxContent += `\t\t\tP: "InheritType", "enum", "", "",1\n`;
        fbxContent += `\t\t\tP: "ScalingMax", "Vector3D", "Vector", "",0,0,0\n`;
        fbxContent += `\t\t\tP: "DefaultAttributeIndex", "int", "Integer", "",-1\n`;
        fbxContent += `\t\t}\n`;
        fbxContent += `\t\tShading: T\n`;
        fbxContent += `\t\tCulling: "CullingOff"\n`;
        fbxContent += `\t}\n`;

        // Write Geometry node
        fbxContent += `\tGeometry: ${geometryIndex * 1000 + 200}, "${meshName}_Geometry", "Mesh" {\n`;
        fbxContent += `\t\tVertices: *${vertexCount * 3} {\n`;
        fbxContent += `\t\t\ta: `;

        // Write vertices
        for (let i = 0; i < positionArray.length; i += 3) {
          fbxContent += `${positionArray[i].toFixed(6)},${positionArray[i + 1].toFixed(6)},${positionArray[i + 2].toFixed(6)}`;
          if (i + 3 < positionArray.length) {
            fbxContent += ',';
          }
        }
        fbxContent += '\n\t\t}\n';

        // Write polygon vertex indices
        fbxContent += `\t\tPolygonVertexIndex: *${indicesArray.length} {\n`;
        fbxContent += `\t\t\ta: `;
        for (let i = 0; i < indicesArray.length; i += 3) {
          // FBX uses negative indices to mark end of polygon
          const idx1 = indicesArray[i];
          const idx2 = indicesArray[i + 1];
          const idx3 = -(indicesArray[i + 2] + 1); // Negative marks end
          fbxContent += `${idx1},${idx2},${idx3}`;
          if (i + 3 < indicesArray.length) {
            fbxContent += ',';
          }
        }
        fbxContent += '\n\t\t}\n';

        // Write normals if available
        if (normalArray && normalArray.length > 0) {
          fbxContent += `\t\tLayerElementNormal: 0 {\n`;
          fbxContent += `\t\t\tVersion: 101\n`;
          fbxContent += `\t\t\tName: ""\n`;
          fbxContent += `\t\t\tMappingInformationType: "ByPolygonVertex"\n`;
          fbxContent += `\t\t\tReferenceInformationType: "Direct"\n`;
          fbxContent += `\t\t\tNormals: *${normalArray.length} {\n`;
          fbxContent += `\t\t\t\ta: `;
          for (let i = 0; i < normalArray.length; i += 3) {
            fbxContent += `${normalArray[i].toFixed(6)},${normalArray[i + 1].toFixed(6)},${normalArray[i + 2].toFixed(6)}`;
            if (i + 3 < normalArray.length) {
              fbxContent += ',';
            }
          }
          fbxContent += '\n\t\t\t}\n';
          fbxContent += `\t\t}\n`;
          fbxContent += `\t\tLayer: 0 {\n`;
          fbxContent += `\t\t\tVersion: 100\n`;
          fbxContent += `\t\t\tLayerElement:  {\n`;
          fbxContent += `\t\t\t\tType: "LayerElementNormal"\n`;
          fbxContent += `\t\t\t\tTypedIndex: 0\n`;
          fbxContent += `\t\t\t}\n`;
          fbxContent += `\t\t}\n`;
        }

        fbxContent += `\t}\n`;

        geometryIndex++;
      }

      meshIndex++;
    }

    fbxContent += `}\n`;
    fbxContent += `Connections:  {\n`;

    // Write connections (link models to geometries)
    for (let i = 0; i < meshIndex; i++) {
      fbxContent += `\tC: "OO",${i * 1000 + 200},${i * 1000 + 100}\n`;
    }

    fbxContent += `}\n`;

    return Buffer.from(fbxContent, 'utf-8');
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
