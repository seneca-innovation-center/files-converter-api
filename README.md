# Files Converter API

A production-ready, open-source NestJS backend for file conversion web applications. Built with TypeScript, Fastify, and modern file processing libraries.

## Features

- **Image Conversion**: Convert images between formats (JPEG, PNG, WebP, AVIF, TIFF, BMP, SVG) with optional resizing, AI background removal, and SVG vectorization
- **Document Conversion**: Convert documents between DOCX, PDF, TXT, HTML, XLSX, and CSV formats
- **3D Model Conversion**: Convert 3D models (GLB/GLTF) with optimization and compression support
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Automatic Cleanup**: Temporary files are automatically cleaned up after 15 minutes
- **OpenAPI Documentation**: Swagger UI available at `/api/docs`
- **Docker Support**: Ready-to-deploy Docker configuration

## Tech Stack

- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript
- **Image Processing**: Sharp, @imgly/background-removal-node, potrace (SVG tracing)
- **Document Processing**: mammoth (DOCX), pdf-parse v2 (PDF extraction), pdf-lib, pdfkit (PDF generation), xlsx (Excel), html-pdf-node, docx (DOCX generation)
- **3D Processing**: @gltf-transform/core, @gltf-transform/functions
- **Validation**: class-validator, class-transformer
- **Rate Limiting**: @nestjs/throttler
- **Documentation**: Swagger/OpenAPI

## Installation

```bash
# Install dependencies
npm install

# Or with bun
bun install
```

## Configuration

Create a `.env` file in the root directory:

```env
PORT=3001
BASE_URL=http://localhost:3000
TMP_DIR=/tmp
NODE_ENV=development
```

## Running the Application

### Local Development

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start:prod
```

### Docker

```bash
# Build the Docker image
docker build -t files-converter-api .

# Run the container
docker run -p 3001:3001 files-converter-api
```

## API Endpoints

### Image Conversion

**POST** `/api/images/convert`

Convert an image to a different format with optional resizing, background removal, and SVG vectorization.

**Request**: `multipart/form-data`

- `file` (required): Image file (max 200MB)
- `format` (required): Target format (`jpeg`, `png`, `webp`, `avif`, `tiff`, `bmp`, `svg`)
- `width` (optional): Resize width in pixels
- `height` (optional): Resize height in pixels
- `quality` (optional): Quality for JPEG/WebP (1-100)
- `removeBackground` (optional): Remove background using AI (boolean)

**Supported Conversions**:

- **TO SVG** (vectorization): PNG, JPG, WEBP, AVIF, TIFF, BMP → SVG
- **FROM SVG** (rasterization): SVG → PNG, JPG, WEBP, AVIF, TIFF, BMP
- **Raster to Raster**: All combinations between JPEG, PNG, WEBP, AVIF, TIFF, BMP

**Response**: Converted image file as download

### 3D Model Conversion

**POST** `/api/3d/convert`

Convert a 3D model to a different format with optional optimization.

**Request**: `multipart/form-data`

- `file` (required): 3D model file - GLB/GLTF (max 200MB)
- `format` (required): Target format (`glb`, `obj`, `usdz`)
- `optimize` (optional): Apply optimization (boolean)
- `compress` (optional): Apply Draco compression for GLB (boolean)

**Response**: Converted 3D model file as download

### Document Conversion

**POST** `/api/files/convert`

Convert documents between various formats with actual content conversion (not just renaming).

**Request**: `multipart/form-data`

- `file` (required): File to convert (max 200MB)
- `targetFormat` (required): Target format/extension
- `options` (optional): Additional conversion options (JSON string)

**Supported Conversions**:

**DOCX Conversions**:

- DOCX → PDF (via HTML rendering)
- DOCX → TXT (text extraction)
- DOCX → HTML (structured conversion)

**PDF Conversions**:

- PDF → TXT (text extraction using pdf-parse v2)
- PDF → DOCX (text extraction + document generation)

**Excel/CSV Conversions**:

- XLSX → CSV (exports first sheet)
- XLSX → TXT (exports as text)
- XLSX → PDF (via text rendering)
- CSV → XLSX (creates Excel workbook)
- CSV → PDF (via text rendering)

**Text/HTML Conversions**:

- TXT → PDF (formatted PDF generation)
- HTML → PDF (web page to PDF)

**Response**: Converted file as download

**Note**: PDF to DOCX conversion extracts text and recreates document structure. Complex layouts, images, and tables may not be perfectly preserved.

## Rate Limiting

The API has rate limiting enabled:

- **Limit**: 10 requests per minute per IP address
- Configured globally via `@nestjs/throttler`

## File Cleanup

Temporary files are automatically cleaned up:

- **Interval**: Every 15 minutes
- **Age Threshold**: Files older than 15 minutes are deleted
- Files are stored in `/tmp` directory (configurable via `TMP_DIR` env variable)

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format
```

## Conversion Details

### Image Processing

- **Sharp**: High-performance image processing for all raster formats
- **AI Background Removal**: Uses ONNX models for intelligent background removal
- **SVG Vectorization**: Potrace library traces bitmap images into vector paths
- **Format Support**: JPEG, PNG, WebP, AVIF, TIFF, BMP, SVG

### Document Processing

- **DOCX Reading**: Mammoth library for Word document parsing
- **PDF Reading**: pdf-parse v2 with PDFParse class for text extraction
- **PDF Generation**: PDFKit and html-pdf-node for creating PDFs
- **Excel Processing**: xlsx library for spreadsheet operations
- **DOCX Generation**: docx library for creating Word documents

### Best Practices

- SVG conversion works best with high-contrast, simple images (logos, icons, line art)
- PDF to DOCX conversion extracts text only; complex layouts may not be preserved
- Large files (>5MB) are supported but may take longer to process
- All temporary files are automatically cleaned up after 15 minutes

## API Examples

### Convert PNG to SVG

```bash
curl -X POST http://localhost:3001/api/images/convert \
  -F "file=@logo.png" \
  -F "format=svg" \
  --output logo.svg
```

### Convert DOCX to PDF

```bash
curl -X POST http://localhost:3001/api/files/convert \
  -F "file=@document.docx" \
  -F "targetFormat=pdf" \
  --output document.pdf
```

### Convert PDF to DOCX

```bash
curl -X POST http://localhost:3001/api/files/convert \
  -F "file=@document.pdf" \
  -F "targetFormat=docx" \
  --output document.docx
```

### Resize and Remove Background

```bash
curl -X POST http://localhost:3001/api/images/convert \
  -F "file=@photo.jpg" \
  -F "format=png" \
  -F "width=800" \
  -F "removeBackground=true" \
  --output photo-nobg.png
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Mohamed Boukari

## Acknowledgments

- Sharp for image processing
- pdf-parse v2 for PDF text extraction
- Potrace for SVG vectorization
- NestJS for the amazing framework
