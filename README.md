# Files Converter API

A production-ready, open-source NestJS backend for file conversion web applications. Built with TypeScript, Fastify, and modern file processing libraries.

## Features

- **Image Conversion**: Convert images between formats (JPEG, PNG, WebP, AVIF, TIFF, BMP) with optional resizing and AI background removal
- **3D Model Conversion**: Convert 3D models (GLB/GLTF) with optimization and compression support
- **General File Conversion**: Extensible file conversion system for various document formats
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Automatic Cleanup**: Temporary files are automatically cleaned up after 15 minutes
- **OpenAPI Documentation**: Swagger UI available at `/api/docs`

## Tech Stack

- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript
- **Image Processing**: Sharp, @imgly/background-removal-node
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

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### Image Conversion

**POST** `/api/images/convert`

Convert an image to a different format with optional resizing and background removal.

**Request**: `multipart/form-data`

- `file` (required): Image file (max 200MB)
- `format` (required): Target format (`jpeg`, `png`, `webp`, `avif`, `tiff`, `bmp`)
- `width` (optional): Resize width in pixels
- `height` (optional): Resize height in pixels
- `quality` (optional): Quality for JPEG/WebP (1-100)
- `removeBackground` (optional): Remove background using AI (boolean)

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

### General File Conversion

**POST** `/api/files/convert`

Convert a file to a different format.

**Request**: `multipart/form-data`

- `file` (required): File to convert (max 200MB)
- `targetFormat` (required): Target format/extension
- `options` (optional): Additional conversion options (JSON string)

**Response**: Converted file as download

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

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
