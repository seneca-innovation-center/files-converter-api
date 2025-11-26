# Files Converter API

A production-ready, open-source NestJS backend for file conversion web applications. Built with TypeScript, Fastify, and modern file processing libraries.

## Features

- **Image Conversion**: Convert images between formats (JPEG, PNG, WebP, AVIF, TIFF, BMP, SVG) with optional resizing, AI background removal, and SVG vectorization
- **Document Conversion**: Convert documents between DOCX, PDF, TXT, HTML, XLSX, and CSV formats
- **PDF Operations**: Merge multiple PDFs, split PDFs by pages, and fill PDF form fields
- **Excel Chart Export**: Export Excel charts as PNG images using Chart.js
- **Presentations**: Create PPTX presentations from structured data and convert PPTX to PDF or images (PNG/JPEG)
- **Ebooks**: Create EPUB files from HTML/TXT content and convert EPUB to PDF, HTML, or TXT
- **Video & Audio Conversion**: Convert video/audio files between MP4, WebM, AVI, MOV, MP3, WAV, OGG, FLAC, and more with FFmpeg
- **Video Enhancements**: Generate thumbnails, trim videos, merge multiple videos, extract frames, and handle subtitles (extract/embed)
- **QR Codes & Barcodes**: Generate QR codes and barcodes (CODE128, EAN13, UPC, etc.) with customizable colors and sizes
- **Archive Management**: Create and extract ZIP, TAR, and TAR.GZ archives
- **Markdown Conversion**: Convert Markdown to HTML or PDF, and HTML to Markdown
- **OCR Text Extraction**: Extract text from images using Tesseract OCR in multiple languages
- **Code Formatting**: Format and syntax-highlight code files (JavaScript, Python, Java, etc.)
- **3D Model Conversion**: Convert 3D models (GLB, GLTF, OBJ, USDZ, FBX, STL, PLY) with optimization and compression support
- **3D Model Data Extraction**: Extract textures, animations, and materials from 3D models
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Automatic Cleanup**: Temporary files are automatically cleaned up after 15 minutes
- **OpenAPI Documentation**: Swagger UI available at `/api/docs`
- **Docker Support**: Ready-to-deploy Docker configuration

## Tech Stack

- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript
- **Image Processing**: Sharp, @imgly/background-removal-node, potrace (SVG tracing)
- **Document Processing**: mammoth (DOCX), pdf-parse v2 (PDF extraction), pdf-lib (PDF manipulation), pdfkit (PDF generation), xlsx (Excel), html-pdf-node, docx (DOCX generation), exceljs (Excel charts), chartjs-node-canvas (Chart rendering)
- **Presentations**: pptxgenjs (PPTX creation), libreoffice-convert (PPTX conversion)
- **Ebooks**: epub-gen (EPUB creation), epub-parser (EPUB reading)
- **Media Processing**: fluent-ffmpeg, @ffmpeg-installer/ffmpeg
- **QR & Barcode**: qrcode, jsbarcode, canvas
- **Archives**: archiver, unzipper, tar-stream
- **Markdown**: marked, turndown
- **OCR**: tesseract.js
- **Code**: prettier, highlight.js
- **3D Processing**: @gltf-transform/core, @gltf-transform/functions, @gltf-transform/extensions, draco3dgltf
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

**Note**: For PPTX conversion features, you need LibreOffice installed. Update your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y libreoffice && rm -rf /var/lib/apt/lists/*
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
- `format` (required): Target format (`glb`, `gltf`, `obj`, `usdz`, `fbx`, `stl`, `ply`)
- `optimize` (optional): Apply optimization (boolean)
- `compress` (optional): Apply Draco compression for GLB (boolean)

**Supported Formats**: GLB, GLTF, OBJ, USDZ, FBX, STL, PLY

**Response**: Converted 3D model file as download

**POST** `/api/3d/extract`

Extract textures, animations, or materials from 3D models.

**Request**: `multipart/form-data`

- `file` (required): 3D model file (GLB/GLTF)
- `extractType` (required): Type of data to extract (`textures`, `animations`, `materials`)

**Response**: JSON file with extracted data metadata

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

**POST** `/api/files/pdf/merge`

Merge multiple PDF files into one.

**Request**: `multipart/form-data`

- `files` (required): Multiple PDF files to merge (in order)

**Response**: Merged PDF file

**POST** `/api/files/pdf/split`

Split a PDF file by pages.

**Request**: `multipart/form-data`

- `file` (required): PDF file to split
- `splitFrom` (optional): Page number to split from (1-indexed)
- `splitTo` (optional): Page number to split to (1-indexed)
- `splitAt` (optional): Split at specific page numbers (comma-separated, e.g., "5,10,15")

**Response**: Split PDF file(s) - returns a single PDF with selected pages, or multiple PDFs if splitAt is used

**POST** `/api/files/pdf/fill-form`

Fill PDF form fields with provided data.

**Request**: `multipart/form-data`

- `file` (required): PDF file with form fields
- `formData` (required): Form field values as JSON string (e.g., `{"name": "John Doe", "email": "john@example.com"}`)

**Response**: Filled PDF file (form is flattened/non-editable)

**POST** `/api/files/excel/export-chart`

Export Excel chart as PNG image.

**Request**: `multipart/form-data`

- `file` (required): Excel file with charts
- `sheetName` (optional): Sheet name (defaults to first sheet)
- `chartIndex` (optional): Chart index (defaults to 0)

**Response**: PNG image of the chart

**Note**: Extracts numeric data from the worksheet and creates a chart visualization using Chart.js. Works best with structured data tables.

### Video & Audio Conversion

**POST** `/api/media/convert`

Convert video and audio files between formats with optional quality and resolution settings.

**Request**: `multipart/form-data`

- `file` (required): Media file (max 200MB)
- `targetFormat` (required): Target format (mp4, webm, avi, mov, mp3, wav, ogg, flac, etc.)
- `videoCodec` (optional): Video codec (e.g., libx264, libx265)
- `audioCodec` (optional): Audio codec (e.g., aac, libmp3lame)
- `audioBitrate` (optional): Audio bitrate (e.g., 192k, 320k)
- `videoBitrate` (optional): Video bitrate (e.g., 1000k, 2000k)
- `width` (optional): Output width in pixels
- `height` (optional): Output height in pixels

**Supported Conversions**:

- **Video**: MP4, WebM, AVI, MOV, MKV, GIF
- **Audio**: MP3, WAV, OGG, FLAC, AAC, M4A
- **Video to Audio**: Extract audio from any video

**POST** `/api/media/extract-audio`

Extract audio track from a video file.

**Request**: `multipart/form-data`

- `file` (required): Video file
- `format` (required): Audio format (mp3, wav, aac, flac)

**Response**: Extracted audio file as download

**POST** `/api/media/thumbnail`

Generate a thumbnail from a video file.

**Request**: `multipart/form-data`

- `file` (required): Video file
- `time` (optional): Time in seconds to capture thumbnail (default: 0)
- `format` (optional): Output format (png, jpeg, default: png)

**Response**: Thumbnail image file

**POST** `/api/media/trim`

Trim/cut a video between specified times.

**Request**: `multipart/form-data`

- `file` (required): Video file
- `startTime` (required): Start time in seconds
- `endTime` (required): End time in seconds
- `targetFormat` (optional): Target format (default: mp4)

**Response**: Trimmed video file

**POST** `/api/media/merge`

Merge multiple video files into one.

**Request**: `multipart/form-data`

- `files` (required): Multiple video files to merge (in order)

**Response**: Merged video file

**POST** `/api/media/extract-frame`

Extract a single frame from a video.

**Request**: `multipart/form-data`

- `file` (required): Video file
- `time` (optional): Time in seconds to extract frame
- `frameNumber` (optional): Frame number to extract (alternative to time)
- `format` (optional): Output format (png, jpeg, default: png)

**Response**: Extracted frame image

**POST** `/api/media/subtitles`

Extract subtitles from a video or embed subtitles into a video.

**Request**: `multipart/form-data`

- `file` (required): Video file
- `operation` (required): Operation type (`extract` or `embed`)
- `subtitleFile` (optional): Subtitle file for embedding (SRT, VTT, ASS)
- `subtitleText` (optional): Subtitle text content for embedding
- `format` (optional): Subtitle format (srt, vtt, ass, default: srt)

**Response**:

- For extract: Subtitle file (SRT/VTT/ASS)
- For embed: Video file with embedded subtitles

### QR Codes & Barcodes

**POST** `/api/qr/generate`

Generate a QR code from text or URL.

**Request**: `application/json`

- `data` (required): Text or URL to encode
- `size` (optional): Size in pixels (100-2000, default: 300)
- `color` (optional): Foreground color (hex, default: #000000)
- `backgroundColor` (optional): Background color (hex, default: #FFFFFF)
- `errorCorrectionLevel` (optional): Error correction level (L, M, Q, H)

**Response**: PNG image file

**POST** `/api/qr/barcode`

Generate a barcode in various formats.

**Request**: `application/json`

- `data` (required): Data to encode
- `format` (required): Barcode format (CODE128, EAN13, EAN8, UPC, CODE39, ITF14, MSI, pharmacode)
- `width` (optional): Width in pixels (100-1000, default: 200)
- `height` (optional): Height in pixels (50-500, default: 100)
- `displayValue` (optional): Show text below barcode (boolean, default: true)

**Response**: PNG image file

### Archives

**POST** `/api/archives/create`

Create an archive from multiple files.

**Request**: `multipart/form-data`

- `files` (required): Multiple files to archive
- `format` (required): Archive format (zip, tar, tar.gz)
- `compressionLevel` (optional): Compression level 0-9 (ZIP only, default: 6)

**Response**: Archive file (ZIP, TAR, or TAR.GZ)

**POST** `/api/archives/extract`

Extract files from an archive.

**Request**: `multipart/form-data`

- `file` (required): Archive file (ZIP, TAR, or TAR.GZ)

**Response**: JSON with extracted file information and base64-encoded contents

### Markdown Conversion

**POST** `/api/markdown/convert`

Convert Markdown to HTML or PDF.

**Request**: `multipart/form-data`

- `file` (required): Markdown file (.md)
- `targetFormat` (required): Target format (html, pdf)

**Response**: Converted file as download

**POST** `/api/markdown/html-to-markdown`

Convert HTML to Markdown.

**Request**: `multipart/form-data`

- `file` (required): HTML file

**Response**: Markdown file as download

### OCR Text Extraction

**POST** `/api/ocr/extract`

Extract text from images using OCR (Optical Character Recognition).

**Request**: `multipart/form-data`

- `file` (required): Image file (PNG, JPG, etc.)
- `language` (optional): OCR language (eng, fra, deu, spa, ita, por, rus, chi_sim, jpn, kor, ara)
- `outputFormat` (optional): Output format (txt, json)

**Supported Languages**:

- English (eng), French (fra), German (deu), Spanish (spa)
- Italian (ita), Portuguese (por), Russian (rus)
- Chinese Simplified (chi_sim), Japanese (jpn), Korean (kor), Arabic (ara)

**Response**: Extracted text as TXT or JSON file

### Code Formatting

**POST** `/api/code/format`

Format and/or syntax-highlight code files.

**Request**: `multipart/form-data`

- `file` (required): Code file
- `language` (optional): Programming language (javascript, typescript, python, java, html, css, json, etc.)
- `outputFormat` (optional): Output format (formatted, html)

**Supported Languages**:

- JavaScript, TypeScript, Python, Java, C#, C++, Go, Rust
- PHP, Ruby, HTML, CSS, JSON, SQL

**Output Formats**:

- `formatted`: Prettified code (using Prettier)
- `html`: Syntax-highlighted HTML page

**Response**: Formatted code file or HTML page

### Presentations API

**POST** `/api/presentations/create`

Create a PPTX presentation from structured data.

**Request**: `application/json`

```json
{
  "title": "My Presentation",
  "slides": [
    {
      "title": "Slide 1",
      "content": "Slide content",
      "bullets": ["Point 1", "Point 2"]
    }
  ]
}
```

**Response**: PPTX file as download

**POST** `/api/presentations/convert`

Convert PPTX to PDF or images.

**Request**: `multipart/form-data`

- `file` (required): PPTX file (max 200MB)
- `targetFormat` (required): Target format (`pdf`, `png`, `jpeg`)

**Response**:

- For PDF: Single PDF file
- For PNG/JPEG: Single image if one slide, ZIP file with all slide images if multiple slides

**Note**: Requires LibreOffice to be installed on the server. For Docker, add `RUN apt-get update && apt-get install -y libreoffice` to your Dockerfile.

### Ebooks API

**POST** `/api/ebooks/create`

Create an EPUB ebook from HTML or TXT content.

**Request**: `application/json`

```json
{
  "title": "My Ebook",
  "author": "Author Name",
  "content": "<h1>Chapter 1</h1><p>Content here...</p>",
  "sourceFormat": "html"
}
```

**Response**: EPUB file as download

**POST** `/api/ebooks/convert`

Convert EPUB to PDF, HTML, or TXT.

**Request**: `multipart/form-data`

- `file` (required): EPUB file (max 200MB)
- `targetFormat` (required): Target format (`pdf`, `html`, `txt`)

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
- **PDF Operations**: pdf-lib for merging, splitting, and form filling
- **Excel Processing**: xlsx and exceljs libraries for spreadsheet operations
- **Excel Charts**: chartjs-node-canvas for chart rendering
- **DOCX Generation**: docx library for creating Word documents

### Presentation Processing

- **PPTX Creation**: pptxgenjs for generating PPTX files from structured data
- **PPTX Conversion**: libreoffice-convert (requires LibreOffice installed) for converting PPTX to PDF/images

### Ebook Processing

- **EPUB Creation**: epub-gen for generating EPUB files from HTML/TXT
- **EPUB Reading**: epub-parser for parsing and converting EPUB files

### Best Practices

- SVG conversion works best with high-contrast, simple images (logos, icons, line art)
- PDF to DOCX conversion extracts text only; complex layouts may not be preserved
- Excel chart export extracts numeric data from worksheets and creates visualizations; works best with structured tables
- PPTX conversion requires LibreOffice to be installed on the server (included in Dockerfile)
- EPUB conversion preserves text content but may not maintain complex formatting
- Video operations (trim, merge, subtitles) require FFmpeg (included via @ffmpeg-installer/ffmpeg)
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

### Convert Video to MP4

```bash
curl -X POST http://localhost:3001/api/media/convert \
  -F "file=@video.avi" \
  -F "targetFormat=mp4" \
  -F "videoCodec=libx264" \
  --output video.mp4
```

### Extract Audio from Video

```bash
curl -X POST http://localhost:3001/api/media/extract-audio \
  -F "file=@video.mp4" \
  -F "format=mp3" \
  --output audio.mp3
```

### Generate QR Code

```bash
curl -X POST http://localhost:3001/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"data":"https://example.com","size":400}' \
  --output qrcode.png
```

### Convert Markdown to PDF

```bash
curl -X POST http://localhost:3001/api/markdown/convert \
  -F "file=@README.md" \
  -F "targetFormat=pdf" \
  --output readme.pdf
```

### Extract Text with OCR

```bash
curl -X POST http://localhost:3001/api/ocr/extract \
  -F "file=@document.jpg" \
  -F "language=eng" \
  --output extracted.txt
```

### Merge PDFs

```bash
curl -X POST http://localhost:3001/api/files/pdf/merge \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  --output merged.pdf
```

### Split PDF

```bash
curl -X POST http://localhost:3001/api/files/pdf/split \
  -F "file=@document.pdf" \
  -F "splitFrom=1" \
  -F "splitTo=10" \
  --output split.pdf
```

### Fill PDF Form

```bash
curl -X POST http://localhost:3001/api/files/pdf/fill-form \
  -F "file=@form.pdf" \
  -F "formData={\"name\":\"John Doe\",\"email\":\"john@example.com\"}" \
  --output filled.pdf
```

### Export Excel Chart

```bash
curl -X POST http://localhost:3001/api/files/excel/export-chart \
  -F "file=@spreadsheet.xlsx" \
  -F "sheetName=Sheet1" \
  --output chart.png
```

### Create PPTX Presentation

```bash
curl -X POST http://localhost:3001/api/presentations/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Presentation","slides":[{"title":"Slide 1","content":"Content"}]}' \
  --output presentation.pptx
```

### Convert PPTX to PDF

```bash
curl -X POST http://localhost:3001/api/presentations/convert \
  -F "file=@presentation.pptx" \
  -F "targetFormat=pdf" \
  --output presentation.pdf
```

### Create EPUB

```bash
curl -X POST http://localhost:3001/api/ebooks/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Book","author":"Author","content":"<h1>Chapter 1</h1>","sourceFormat":"html"}' \
  --output book.epub
```

### Convert EPUB to PDF

```bash
curl -X POST http://localhost:3001/api/ebooks/convert \
  -F "file=@book.epub" \
  -F "targetFormat=pdf" \
  --output book.pdf
```

### Generate Video Thumbnail

```bash
curl -X POST http://localhost:3001/api/media/thumbnail \
  -F "file=@video.mp4" \
  -F "time=5" \
  --output thumbnail.png
```

### Trim Video

```bash
curl -X POST http://localhost:3001/api/media/trim \
  -F "file=@video.mp4" \
  -F "startTime=10" \
  -F "endTime=60" \
  --output trimmed.mp4
```

### Extract 3D Model Data

```bash
curl -X POST http://localhost:3001/api/3d/extract \
  -F "file=@model.glb" \
  -F "extractType=textures" \
  --output textures.json
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
