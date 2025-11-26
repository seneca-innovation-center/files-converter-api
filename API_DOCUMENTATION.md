# Files Converter API - Frontend Integration Guide

**Base URL**: `http://localhost:3001/api`

**Swagger Documentation**: `http://localhost:3001/api/docs`

## Table of Contents

1. [Images API](#images-api)
2. [Documents API](#documents-api)
3. [PDF Operations API](#pdf-operations-api)
4. [Excel Operations API](#excel-operations-api)
5. [Presentations API](#presentations-api)
6. [Ebooks API](#ebooks-api)
7. [3D Models API](#3d-models-api)
8. [Video & Audio API](#video--audio-api)
9. [QR Codes & Barcodes API](#qr-codes--barcodes-api)
10. [Archives API](#archives-api)
11. [Markdown API](#markdown-api)
12. [OCR API](#ocr-api)
13. [Code Formatting API](#code-formatting-api)
14. [TypeScript Types](#typescript-types)

---

## Images API

### POST `/api/images/convert`

Convert images between formats with optional resizing and background removal.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Image file (max 200MB)
  format: ImageFormat;           // Target format
  width?: number;                // Resize width (1-10000)
  height?: number;               // Resize height (1-10000)
  quality?: number;              // Quality 1-100 (JPEG/WebP only)
  removeBackground?: boolean;    // AI background removal
}
```

**Supported Formats**:

```typescript
type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'bmp' | 'svg';
```

**Response**: Binary image file

**Example**:

```typescript
// JavaScript/TypeScript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('format', 'png');
formData.append('width', '800');
formData.append('removeBackground', 'true');

const response = await fetch('http://localhost:3001/api/images/convert', {
  method: 'POST',
  body: formData,
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
```

---

## PDF Operations API

### POST `/api/files/pdf/merge`

Merge multiple PDF files into one.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  files: File[]; // Multiple PDF files to merge (in order)
}
```

**Response**: Binary merged PDF file

**Example**:

```typescript
const formData = new FormData();
formData.append('files', pdfFile1);
formData.append('files', pdfFile2);
formData.append('files', pdfFile3);

const response = await fetch('http://localhost:3001/api/files/pdf/merge', {
  method: 'POST',
  body: formData,
});

const blob = await response.blob();
```

### POST `/api/files/pdf/split`

Split a PDF file by pages.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;              // PDF file to split
  splitFrom?: number;      // Page number to split from (1-indexed)
  splitTo?: number;        // Page number to split to (1-indexed)
  splitAt?: string;        // Split at specific page numbers (comma-separated, e.g., "5,10,15")
}
```

**Response**: Binary PDF file with selected pages

**Example**:

```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('splitFrom', '1');
formData.append('splitTo', '10');

const response = await fetch('http://localhost:3001/api/files/pdf/split', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/files/pdf/fill-form`

Fill PDF form fields with provided data.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // PDF file with form fields
  formData: string; // Form field values as JSON string
}
```

**Response**: Binary PDF file with filled form (flattened/non-editable)

**Example**:

```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append(
  'formData',
  JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    age: '30',
  }),
);

const response = await fetch('http://localhost:3001/api/files/pdf/fill-form', {
  method: 'POST',
  body: formData,
});
```

---

## Excel Operations API

### POST `/api/files/excel/export-chart`

Export Excel chart as PNG image.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;              // Excel file with charts
  sheetName?: string;      // Sheet name (optional, defaults to first sheet)
  chartIndex?: number;     // Chart index (defaults to 0)
}
```

**Response**: PNG image of the chart

**Note**: Extracts numeric data from the worksheet and creates a chart visualization using Chart.js. Works best with structured data tables.

**Example**:

```typescript
const formData = new FormData();
formData.append('file', excelFile);
formData.append('sheetName', 'Sheet1');
formData.append('chartIndex', '0');

const response = await fetch(
  'http://localhost:3001/api/files/excel/export-chart',
  {
    method: 'POST',
    body: formData,
  },
);

const blob = await response.blob();
```

---

## Documents API

### POST `/api/files/convert`

Convert documents between various formats.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;              // Document file (max 200MB)
  targetFormat: string;    // Target format/extension
  options?: string;        // JSON string of additional options
}
```

**Supported Conversions**:

```typescript
type DocumentConversion =
  // DOCX conversions
  | 'docx->pdf'
  | 'docx->txt'
  | 'docx->html'
  // PDF conversions
  | 'pdf->txt'
  | 'pdf->docx'
  // Excel conversions
  | 'xlsx->csv'
  | 'xlsx->txt'
  | 'xlsx->pdf'
  | 'csv->xlsx'
  | 'csv->pdf'
  // Text conversions
  | 'txt->pdf'
  | 'html->pdf';
```

**Response**: Binary document file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', docxFile);
formData.append('targetFormat', 'pdf');

const response = await fetch('http://localhost:3001/api/files/convert', {
  method: 'POST',
  body: formData,
});

const blob = await response.blob();
```

---

## Presentations API

### POST `/api/presentations/create`

Create a PPTX presentation from structured data.

**Request Type**: `application/json`

**Parameters**:

```typescript
{
  title: string; // Title of the presentation
  slides: Array<{
    title: string; // Slide title
    content?: string; // Main content (optional)
    bullets?: string[]; // Bullet points (optional)
  }>;
}
```

**Response**: Binary PPTX file

**Example**:

```typescript
const response = await fetch('http://localhost:3001/api/presentations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Presentation',
    slides: [
      {
        title: 'Introduction',
        content: 'Welcome to the presentation',
      },
      {
        title: 'Features',
        bullets: ['Feature 1', 'Feature 2', 'Feature 3'],
      },
    ],
  }),
});

const blob = await response.blob();
```

### POST `/api/presentations/convert`

Convert PPTX to PDF or images.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // PPTX file (max 200MB)
  targetFormat: 'pdf' | 'png' | 'jpeg';
}
```

**Response**:

- For PDF: Single PDF file
- For PNG/JPEG: Single image if one slide, ZIP file with all slide images if multiple slides

**Note**: Requires LibreOffice to be installed on the server.

**Example**:

```typescript
const formData = new FormData();
formData.append('file', pptxFile);
formData.append('targetFormat', 'pdf');

const response = await fetch(
  'http://localhost:3001/api/presentations/convert',
  {
    method: 'POST',
    body: formData,
  },
);

const blob = await response.blob();
```

---

## Ebooks API

### POST `/api/ebooks/create`

Create an EPUB ebook from HTML or TXT content.

**Request Type**: `application/json`

**Parameters**:

```typescript
{
  title: string; // Title of the ebook
  author: string; // Author name
  content: string; // Content in HTML or plain text
  sourceFormat: 'html' | 'txt'; // Input format
}
```

**Response**: Binary EPUB file

**Example**:

```typescript
const response = await fetch('http://localhost:3001/api/ebooks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Awesome Ebook',
    author: 'John Doe',
    content: '<h1>Chapter 1</h1><p>This is the content.</p>',
    sourceFormat: 'html',
  }),
});

const blob = await response.blob();
```

### POST `/api/ebooks/convert`

Convert EPUB to PDF, HTML, or TXT.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // EPUB file (max 200MB)
  targetFormat: 'pdf' | 'html' | 'txt';
}
```

**Response**: Binary converted file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', epubFile);
formData.append('targetFormat', 'pdf');

const response = await fetch('http://localhost:3001/api/ebooks/convert', {
  method: 'POST',
  body: formData,
});

const blob = await response.blob();
```

---

## 3D Models API

### POST `/api/3d/convert`

Convert 3D models with optional optimization.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;              // 3D model file (max 200MB)
  format: '3DFormat';      // Target format
  optimize?: boolean;      // Apply optimization
  compress?: boolean;      // Apply Draco compression (GLB only)
}
```

**Supported Formats**:

```typescript
type ThreeDFormat = 'glb' | 'gltf' | 'obj' | 'usdz' | 'fbx' | 'stl' | 'ply';
```

**Response**: Binary 3D model file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', gltfFile);
formData.append('format', 'glb');
formData.append('optimize', 'true');
formData.append('compress', 'true');

const response = await fetch('http://localhost:3001/api/3d/convert', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/3d/extract`

Extract textures, animations, or materials from 3D models.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // 3D model file (GLB/GLTF)
  extractType: 'textures' | 'animations' | 'materials';
}
```

**Response**: JSON file with extracted data metadata

**Example**:

```typescript
const formData = new FormData();
formData.append('file', glbFile);
formData.append('extractType', 'textures');

const response = await fetch('http://localhost:3001/api/3d/extract', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// Contains texture metadata (URI, MIME type, etc.)
```

---

## Video & Audio API

### POST `/api/media/convert`

Convert video and audio files between formats.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                // Media file (max 200MB)
  targetFormat: string;      // Target format (mp4, mp3, etc.)
  videoCodec?: string;       // Video codec (e.g., 'libx264', 'libx265')
  audioCodec?: string;       // Audio codec (e.g., 'aac', 'libmp3lame')
  audioBitrate?: string;     // Audio bitrate (e.g., '192k', '320k')
  videoBitrate?: string;     // Video bitrate (e.g., '1000k', '2000k')
  width?: number;            // Output width (1-4096)
  height?: number;           // Output height (1-4096)
}
```

**Supported Formats**:

```typescript
type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'gif';
type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac' | 'm4a';
```

**Response**: Binary media file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('targetFormat', 'mp4');
formData.append('videoCodec', 'libx264');
formData.append('videoBitrate', '1000k');
formData.append('width', '1280');
formData.append('height', '720');

const response = await fetch('http://localhost:3001/api/media/convert', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/extract-audio`

Extract audio track from video file.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // Video file
  format: string; // Audio format ('mp3', 'wav', 'aac', 'flac')
}
```

**Response**: Binary audio file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('format', 'mp3');

const response = await fetch('http://localhost:3001/api/media/extract-audio', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/thumbnail`

Generate a thumbnail from a video file.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Video file
  time?: number;                  // Time in seconds to capture thumbnail (default: 0)
  format?: 'png' | 'jpeg';       // Output format (default: png)
}
```

**Response**: Binary thumbnail image

**Example**:

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('time', '5');
formData.append('format', 'png');

const response = await fetch('http://localhost:3001/api/media/thumbnail', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/trim`

Trim/cut a video between specified times.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Video file
  startTime: number;             // Start time in seconds
  endTime: number;               // End time in seconds
  targetFormat?: string;         // Target format (default: mp4)
}
```

**Response**: Binary trimmed video file

**Example**:

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('startTime', '10');
formData.append('endTime', '60');

const response = await fetch('http://localhost:3001/api/media/trim', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/merge`

Merge multiple video files into one.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  files: File[];                  // Multiple video files to merge (in order)
}
```

**Response**: Binary merged video file

**Example**:

```typescript
const formData = new FormData();
formData.append('files', videoFile1);
formData.append('files', videoFile2);
formData.append('files', videoFile3);

const response = await fetch('http://localhost:3001/api/media/merge', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/extract-frame`

Extract a single frame from a video.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Video file
  time?: number;                 // Time in seconds to extract frame
  frameNumber?: number;          // Frame number to extract (alternative to time)
  format?: 'png' | 'jpeg';       // Output format (default: png)
}
```

**Response**: Binary frame image

**Example**:

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('time', '5.5');
formData.append('format', 'png');

const response = await fetch('http://localhost:3001/api/media/extract-frame', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/media/subtitles`

Extract subtitles from a video or embed subtitles into a video.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Video file
  operation: 'extract' | 'embed'; // Operation type
  subtitleFile?: File;           // Subtitle file for embedding (SRT, VTT, ASS)
  subtitleText?: string;         // Subtitle text content for embedding
  format?: 'srt' | 'vtt' | 'ass'; // Subtitle format (default: srt)
}
```

**Response**:

- For extract: Subtitle file (SRT/VTT/ASS)
- For embed: Video file with embedded subtitles

**Example**:

```typescript
// Extract subtitles
const formData = new FormData();
formData.append('file', videoFile);
formData.append('operation', 'extract');
formData.append('format', 'srt');

const response = await fetch('http://localhost:3001/api/media/subtitles', {
  method: 'POST',
  body: formData,
});

// Embed subtitles
const formData2 = new FormData();
formData2.append('file', videoFile);
formData2.append('subtitleFile', subtitleFile);
formData2.append('operation', 'embed');

const response2 = await fetch('http://localhost:3001/api/media/subtitles', {
  method: 'POST',
  body: formData2,
});
```

### POST `/api/media/transcribe`

Transcribe video to text using speech recognition (OpenAI Whisper).

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                              // Video file
  language?: string;                        // Language code (e.g., 'en', 'fr', 'es'). Auto-detects if not provided
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json'; // Output format (default: 'txt')
}
```

**Supported Output Formats**:

- `txt`: Plain text transcription (default)
- `srt`: Subtitle format with timestamps
- `vtt`: WebVTT format with timestamps
- `json`: Structured JSON with timestamps and text segments

**Response**: Transcription file in the requested format

**Note**: Requires Whisper models to be downloaded first. Run `npx whisper-node download` to download the model (recommended: `base` model for multi-language support).

**Example**:

```typescript
// Transcribe to plain text
const formData = new FormData();
formData.append('file', videoFile);
formData.append('language', 'en');
formData.append('outputFormat', 'txt');

const response = await fetch('http://localhost:3001/api/media/transcribe', {
  method: 'POST',
  body: formData,
});

const blob = await response.blob();
const text = await blob.text();

// Transcribe to SRT subtitle format
const formData2 = new FormData();
formData2.append('file', videoFile);
formData2.append('outputFormat', 'srt');

const response2 = await fetch('http://localhost:3001/api/media/transcribe', {
  method: 'POST',
  body: formData2,
});

// Transcribe to JSON with timestamps
const formData3 = new FormData();
formData3.append('file', videoFile);
formData3.append('outputFormat', 'json');

const response3 = await fetch('http://localhost:3001/api/media/transcribe', {
  method: 'POST',
  body: formData3,
});

const jsonBlob = await response3.blob();
const jsonText = await jsonBlob.text();
const transcription = JSON.parse(jsonText);
// Returns: [{ start: "00:00:14.310", end: "00:00:16.480", speech: "text" }]
```

---

## QR Codes & Barcodes API

### POST `/api/qr/generate`

Generate QR code from text or URL.

**Request Type**: `application/json`

**Parameters**:

```typescript
{
  data: string;                          // Text or URL to encode
  size?: number;                         // Size in pixels (100-2000, default: 300)
  color?: string;                        // Foreground color hex (default: '#000000')
  backgroundColor?: string;              // Background color hex (default: '#FFFFFF')
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';  // Error correction (default: 'M')
}
```

**Response**: PNG image

**Example**:

```typescript
const response = await fetch('http://localhost:3001/api/qr/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: 'https://example.com',
    size: 400,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    errorCorrectionLevel: 'M',
  }),
});

const blob = await response.blob();
```

### POST `/api/qr/barcode`

Generate barcode in various formats.

**Request Type**: `application/json`

**Parameters**:

```typescript
{
  data: string;                          // Data to encode
  format: BarcodeFormat;                 // Barcode format
  width?: number;                        // Width in pixels (100-1000, default: 200)
  height?: number;                       // Height in pixels (50-500, default: 100)
  displayValue?: boolean;                // Show text below (default: true)
}
```

**Barcode Formats**:

```typescript
type BarcodeFormat =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'CODE39'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode';
```

**Response**: PNG image

**Example**:

```typescript
const response = await fetch('http://localhost:3001/api/qr/barcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: '1234567890123',
    format: 'EAN13',
    width: 200,
    height: 100,
    displayValue: true,
  }),
});
```

---

## Archives API

### POST `/api/archives/create`

Create archive from multiple files.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  files: File[];                    // Multiple files to archive
  format: ArchiveFormat;            // Archive format
  compressionLevel?: number;        // 0-9 (ZIP only, default: 6)
}
```

**Archive Formats**:

```typescript
type ArchiveFormat = 'zip' | 'tar' | 'tar.gz';
```

**Response**: Binary archive file

**Example**:

```typescript
const formData = new FormData();
files.forEach((file) => formData.append('files', file));
formData.append('format', 'zip');
formData.append('compressionLevel', '9');

const response = await fetch('http://localhost:3001/api/archives/create', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/archives/extract`

Extract files from archive.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // Archive file (ZIP, TAR, or TAR.GZ)
}
```

**Response**: JSON

```typescript
{
  success: boolean;
  filesCount: number;
  files: Array<{
    filename: string;
    size: number;
    data: string; // base64-encoded
  }>;
}
```

**Example**:

```typescript
const formData = new FormData();
formData.append('file', archiveFile);

const response = await fetch('http://localhost:3001/api/archives/extract', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// Decode base64 files
result.files.forEach((file) => {
  const binary = atob(file.data);
  const blob = new Blob([
    new Uint8Array([...binary].map((c) => c.charCodeAt(0))),
  ]);
});
```

---

## Markdown API

### POST `/api/markdown/convert`

Convert Markdown to HTML or PDF.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // Markdown file (.md)
  targetFormat: 'html' | 'pdf';
}
```

**Response**: Binary file (HTML or PDF)

**Example**:

```typescript
const formData = new FormData();
formData.append('file', markdownFile);
formData.append('targetFormat', 'pdf');

const response = await fetch('http://localhost:3001/api/markdown/convert', {
  method: 'POST',
  body: formData,
});
```

### POST `/api/markdown/html-to-markdown`

Convert HTML to Markdown.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File; // HTML file
}
```

**Response**: Markdown file (.md)

**Example**:

```typescript
const formData = new FormData();
formData.append('file', htmlFile);

const response = await fetch(
  'http://localhost:3001/api/markdown/html-to-markdown',
  {
    method: 'POST',
    body: formData,
  },
);
```

---

## OCR API

### POST `/api/ocr/extract`

Extract text from images using OCR.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                    // Image file
  language?: OcrLanguage;        // OCR language (default: 'eng')
  outputFormat?: 'txt' | 'json'; // Output format (default: 'txt')
}
```

**Supported Languages**:

```typescript
type OcrLanguage =
  | 'eng' // English
  | 'fra' // French
  | 'deu' // German
  | 'spa' // Spanish
  | 'ita' // Italian
  | 'por' // Portuguese
  | 'rus' // Russian
  | 'chi_sim' // Chinese Simplified
  | 'jpn' // Japanese
  | 'kor' // Korean
  | 'ara'; // Arabic
```

**Response**: Text file or JSON

**JSON Response Format**:

```typescript
{
  text: string;
  confidence: number;
}
```

**Example**:

```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('language', 'eng');
formData.append('outputFormat', 'json');

const response = await fetch('http://localhost:3001/api/ocr/extract', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('Extracted text:', result.text);
console.log('Confidence:', result.confidence);
```

---

## Code Formatting API

### POST `/api/code/format`

Format and/or syntax-highlight code files.

**Request Type**: `multipart/form-data`

**Parameters**:

```typescript
{
  file: File;                          // Code file
  language?: CodeLanguage;             // Programming language
  outputFormat?: 'formatted' | 'html'; // Output format (default: 'formatted')
}
```

**Supported Languages**:

```typescript
type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'html'
  | 'css'
  | 'json'
  | 'sql';
```

**Response**: Formatted code file or HTML page

**Example**:

```typescript
// Get formatted code
const formData = new FormData();
formData.append('file', codeFile);
formData.append('language', 'javascript');
formData.append('outputFormat', 'formatted');

const response = await fetch('http://localhost:3001/api/code/format', {
  method: 'POST',
  body: formData,
});

const formattedCode = await response.text();
```

```typescript
// Get syntax-highlighted HTML
const formData = new FormData();
formData.append('file', codeFile);
formData.append('language', 'javascript');
formData.append('outputFormat', 'html');

const response = await fetch('http://localhost:3001/api/code/format', {
  method: 'POST',
  body: formData,
});

const html = await response.text();
```

---

## TypeScript Types

Complete TypeScript type definitions for frontend integration:

```typescript
// ============================================
// IMAGE TYPES
// ============================================

export type ImageFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'tiff'
  | 'bmp'
  | 'svg';

export interface ImageConvertRequest {
  file: File;
  format: ImageFormat;
  width?: number;
  height?: number;
  quality?: number;
  removeBackground?: boolean;
}

// ============================================
// DOCUMENT TYPES
// ============================================

export interface DocumentConvertRequest {
  file: File;
  targetFormat: string;
  options?: string;
}

// ============================================
// 3D MODEL TYPES
// ============================================

export type ThreeDFormat =
  | 'glb'
  | 'gltf'
  | 'obj'
  | 'usdz'
  | 'fbx'
  | 'stl'
  | 'ply';

export interface ThreeDConvertRequest {
  file: File;
  format: ThreeDFormat;
  optimize?: boolean;
  compress?: boolean;
}

export interface Extract3DDataRequest {
  file: File;
  extractType: 'textures' | 'animations' | 'materials';
}

// ============================================
// MEDIA TYPES
// ============================================

export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'gif';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac' | 'm4a';

export interface MediaConvertRequest {
  file: File;
  targetFormat: string;
  videoCodec?: string;
  audioCodec?: string;
  audioBitrate?: string;
  videoBitrate?: string;
  width?: number;
  height?: number;
}

export interface ExtractAudioRequest {
  file: File;
  format: 'mp3' | 'wav' | 'aac' | 'flac';
}

// ============================================
// QR & BARCODE TYPES
// ============================================

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface GenerateQrRequest {
  data: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
}

export type BarcodeFormat =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'CODE39'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode';

export interface GenerateBarcodeRequest {
  data: string;
  format: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

// ============================================
// ARCHIVE TYPES
// ============================================

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz';

export interface CreateArchiveRequest {
  files: File[];
  format: ArchiveFormat;
  compressionLevel?: number;
}

export interface ExtractArchiveRequest {
  file: File;
}

export interface ExtractArchiveResponse {
  success: boolean;
  filesCount: number;
  files: Array<{
    filename: string;
    size: number;
    data: string; // base64
  }>;
}

// ============================================
// MARKDOWN TYPES
// ============================================

export type MarkdownFormat = 'html' | 'pdf';

export interface ConvertMarkdownRequest {
  file: File;
  targetFormat: MarkdownFormat;
}

export interface HtmlToMarkdownRequest {
  file: File;
}

// ============================================
// OCR TYPES
// ============================================

export type OcrLanguage =
  | 'eng'
  | 'fra'
  | 'deu'
  | 'spa'
  | 'ita'
  | 'por'
  | 'rus'
  | 'chi_sim'
  | 'jpn'
  | 'kor'
  | 'ara';

export interface ExtractTextRequest {
  file: File;
  language?: OcrLanguage;
  outputFormat?: 'txt' | 'json';
}

export interface OcrJsonResponse {
  text: string;
  confidence: number;
}

// ============================================
// CODE FORMATTING TYPES
// ============================================

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'html'
  | 'css'
  | 'json'
  | 'sql';

export interface FormatCodeRequest {
  file: File;
  language?: CodeLanguage;
  outputFormat?: 'formatted' | 'html';
}

// ============================================
// PDF OPERATIONS TYPES
// ============================================

export interface MergePdfRequest {
  files: File[];
}

export interface SplitPdfRequest {
  file: File;
  splitFrom?: number;
  splitTo?: number;
  splitAt?: string; // Comma-separated page numbers
}

export interface FillPdfFormRequest {
  file: File;
  formData: string; // JSON string
}

// ============================================
// EXCEL OPERATIONS TYPES
// ============================================

export interface ExportExcelChartRequest {
  file: File;
  sheetName?: string;
  chartIndex?: number;
}

// ============================================
// PRESENTATIONS TYPES
// ============================================

export type PresentationTargetFormat = 'pdf' | 'png' | 'jpeg';

export interface SlideData {
  title: string;
  content?: string;
  bullets?: string[];
}

export interface CreatePresentationRequest {
  title: string;
  slides: SlideData[];
}

export interface ConvertPresentationRequest {
  file: File;
  targetFormat: PresentationTargetFormat;
}

// ============================================
// EBOOKS TYPES
// ============================================

export type EbookTargetFormat = 'pdf' | 'html' | 'txt';
export type EbookSourceFormat = 'html' | 'txt';

export interface CreateEbookRequest {
  title: string;
  author: string;
  content: string;
  sourceFormat: EbookSourceFormat;
}

export interface ConvertEbookRequest {
  file: File;
  targetFormat: EbookTargetFormat;
}

// ============================================
// VIDEO ENHANCEMENT TYPES
// ============================================

export interface GenerateThumbnailRequest {
  file: File;
  time?: number;
  format?: 'png' | 'jpeg';
}

export interface TrimVideoRequest {
  file: File;
  startTime: number;
  endTime: number;
  targetFormat?: string;
}

export interface MergeVideosRequest {
  files: File[];
}

export interface ExtractFrameRequest {
  file: File;
  time?: number;
  frameNumber?: number;
  format?: 'png' | 'jpeg';
}

export interface SubtitleOperationRequest {
  file: File;
  operation: 'extract' | 'embed';
  subtitleFile?: File;
  subtitleText?: string;
  format?: 'srt' | 'vtt' | 'ass';
}

export interface TranscribeVideoRequest {
  file: File;
  language?: string; // Language code (e.g., 'en', 'fr', 'es')
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json'; // Default: 'txt'
}

export interface TranscriptionSegment {
  start: string; // Timestamp in format "HH:MM:SS.mmm"
  end: string; // Timestamp in format "HH:MM:SS.mmm"
  speech: string; // Transcribed text
}
```

---

## React/TypeScript Helper Functions

Utility functions for easier integration:

```typescript
// api-client.ts
const API_BASE_URL = 'http://localhost:3001/api';

export class FileConverterAPI {
  // Images
  static async convertImage(request: ImageConvertRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('format', request.format);
    if (request.width) formData.append('width', request.width.toString());
    if (request.height) formData.append('height', request.height.toString());
    if (request.quality) formData.append('quality', request.quality.toString());
    if (request.removeBackground) formData.append('removeBackground', 'true');

    const response = await fetch(`${API_BASE_URL}/images/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Image conversion failed');
    return await response.blob();
  }

  // Documents
  static async convertDocument(request: DocumentConvertRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('targetFormat', request.targetFormat);
    if (request.options) formData.append('options', request.options);

    const response = await fetch(`${API_BASE_URL}/files/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Document conversion failed');
    return await response.blob();
  }

  // Media
  static async convertMedia(request: MediaConvertRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('targetFormat', request.targetFormat);
    if (request.videoCodec) formData.append('videoCodec', request.videoCodec);
    if (request.audioCodec) formData.append('audioCodec', request.audioCodec);
    if (request.audioBitrate)
      formData.append('audioBitrate', request.audioBitrate);
    if (request.videoBitrate)
      formData.append('videoBitrate', request.videoBitrate);
    if (request.width) formData.append('width', request.width.toString());
    if (request.height) formData.append('height', request.height.toString());

    const response = await fetch(`${API_BASE_URL}/media/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Media conversion failed');
    return await response.blob();
  }

  // QR Code
  static async generateQR(request: GenerateQrRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/qr/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('QR generation failed');
    return await response.blob();
  }

  // Barcode
  static async generateBarcode(request: GenerateBarcodeRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/qr/barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Barcode generation failed');
    return await response.blob();
  }

  // OCR
  static async extractText(
    request: ExtractTextRequest,
  ): Promise<string | OcrJsonResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.language) formData.append('language', request.language);
    if (request.outputFormat)
      formData.append('outputFormat', request.outputFormat);

    const response = await fetch(`${API_BASE_URL}/ocr/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('OCR failed');

    if (request.outputFormat === 'json') {
      return await response.json();
    }
    return await response.text();
  }

  // PDF Operations
  static async mergePdfs(request: MergePdfRequest): Promise<Blob> {
    const formData = new FormData();
    request.files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/files/pdf/merge`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('PDF merge failed');
    return await response.blob();
  }

  static async splitPdf(request: SplitPdfRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.splitFrom)
      formData.append('splitFrom', request.splitFrom.toString());
    if (request.splitTo) formData.append('splitTo', request.splitTo.toString());
    if (request.splitAt) formData.append('splitAt', request.splitAt);

    const response = await fetch(`${API_BASE_URL}/files/pdf/split`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('PDF split failed');
    return await response.blob();
  }

  static async fillPdfForm(request: FillPdfFormRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('formData', request.formData);

    const response = await fetch(`${API_BASE_URL}/files/pdf/fill-form`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('PDF form filling failed');
    return await response.blob();
  }

  // Excel Operations
  static async exportExcelChart(
    request: ExportExcelChartRequest,
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.sheetName) formData.append('sheetName', request.sheetName);
    if (request.chartIndex !== undefined)
      formData.append('chartIndex', request.chartIndex.toString());

    const response = await fetch(`${API_BASE_URL}/files/excel/export-chart`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Excel chart export failed');
    return await response.blob();
  }

  // Presentations
  static async createPresentation(
    request: CreatePresentationRequest,
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/presentations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Presentation creation failed');
    return await response.blob();
  }

  static async convertPresentation(
    request: ConvertPresentationRequest,
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('targetFormat', request.targetFormat);

    const response = await fetch(`${API_BASE_URL}/presentations/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Presentation conversion failed');
    return await response.blob();
  }

  // Ebooks
  static async createEbook(request: CreateEbookRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/ebooks/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('EPUB creation failed');
    return await response.blob();
  }

  static async convertEbook(request: ConvertEbookRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('targetFormat', request.targetFormat);

    const response = await fetch(`${API_BASE_URL}/ebooks/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Ebook conversion failed');
    return await response.blob();
  }

  // 3D Model Extraction
  static async extract3DData(request: Extract3DDataRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('extractType', request.extractType);

    const response = await fetch(`${API_BASE_URL}/3d/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('3D data extraction failed');
    return await response.blob();
  }

  // Video Enhancements
  static async generateThumbnail(
    request: GenerateThumbnailRequest,
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.time !== undefined)
      formData.append('time', request.time.toString());
    if (request.format) formData.append('format', request.format);

    const response = await fetch(`${API_BASE_URL}/media/thumbnail`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Thumbnail generation failed');
    return await response.blob();
  }

  static async trimVideo(request: TrimVideoRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('startTime', request.startTime.toString());
    formData.append('endTime', request.endTime.toString());
    if (request.targetFormat)
      formData.append('targetFormat', request.targetFormat);

    const response = await fetch(`${API_BASE_URL}/media/trim`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Video trimming failed');
    return await response.blob();
  }

  static async mergeVideos(request: MergeVideosRequest): Promise<Blob> {
    const formData = new FormData();
    request.files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/media/merge`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Video merging failed');
    return await response.blob();
  }

  static async extractFrame(request: ExtractFrameRequest): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.time !== undefined)
      formData.append('time', request.time.toString());
    if (request.frameNumber !== undefined)
      formData.append('frameNumber', request.frameNumber.toString());
    if (request.format) formData.append('format', request.format);

    const response = await fetch(`${API_BASE_URL}/media/extract-frame`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Frame extraction failed');
    return await response.blob();
  }

  static async handleSubtitles(
    request: SubtitleOperationRequest,
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('operation', request.operation);
    if (request.subtitleFile)
      formData.append('subtitleFile', request.subtitleFile);
    if (request.subtitleText)
      formData.append('subtitleText', request.subtitleText);
    if (request.format) formData.append('format', request.format);

    const response = await fetch(`${API_BASE_URL}/media/subtitles`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Subtitle operation failed');
    return await response.blob();
  }

  static async transcribeVideo(
    request: TranscribeVideoRequest,
  ): Promise<Blob | TranscriptionSegment[]> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.language) formData.append('language', request.language);
    if (request.outputFormat)
      formData.append('outputFormat', request.outputFormat);

    const response = await fetch(`${API_BASE_URL}/media/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Video transcription failed');

    // If JSON format, parse and return array
    if (request.outputFormat === 'json') {
      const blob = await response.blob();
      const text = await blob.text();
      return JSON.parse(text) as TranscriptionSegment[];
    }

    return await response.blob();
  }

  // Archives
  static async createArchive(request: CreateArchiveRequest): Promise<Blob> {
    const formData = new FormData();
    request.files.forEach((file) => formData.append('files', file));
    formData.append('format', request.format);
    if (request.compressionLevel) {
      formData.append('compressionLevel', request.compressionLevel.toString());
    }

    const response = await fetch(`${API_BASE_URL}/archives/create`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Archive creation failed');
    return await response.blob();
  }

  static async extractArchive(
    request: ExtractArchiveRequest,
  ): Promise<ExtractArchiveResponse> {
    const formData = new FormData();
    formData.append('file', request.file);

    const response = await fetch(`${API_BASE_URL}/archives/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Archive extraction failed');
    return await response.json();
  }
}

// Helper to download blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters or file format
- `413 Payload Too Large`: File exceeds 200MB limit
- `429 Too Many Requests`: Rate limit exceeded (10 requests/minute)
- `500 Internal Server Error`: Server error during conversion

**Error Response Format**:

```typescript
{
  statusCode: number;
  message: string;
  error?: string;
}
```

**Example Error Handling**:

```typescript
try {
  const blob = await FileConverterAPI.convertImage({
    file: imageFile,
    format: 'png',
  });
  downloadBlob(blob, 'converted.png');
} catch (error) {
  if (error instanceof Error) {
    console.error('Conversion failed:', error.message);
    // Show error to user
  }
}
```

---

## Rate Limiting

- **Limit**: 10 requests per minute per IP address
- **Header**: `X-RateLimit-Remaining` shows remaining requests
- **Response**: 429 status code when limit exceeded

---

## File Size Limits

- **Maximum file size**: 200MB per request
- **Multiple files** (archives): Total size must not exceed 200MB

---

## CORS Configuration

The API is configured to accept requests from any origin in development.  
For production, update the CORS configuration in `main.ts`.

---

## Complete React Example

```typescript
import React, { useState } from 'react';
import { FileConverterAPI, downloadBlob } from './api-client';

function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const blob = await FileConverterAPI.convertImage({
        file,
        format,
        width: 800,
      });

      downloadBlob(blob, `converted.${format}`);
    } catch (error) {
      alert('Conversion failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="webp">WebP</option>
      </select>

      <button onClick={handleConvert} disabled={!file || loading}>
        {loading ? 'Converting...' : 'Convert'}
      </button>
    </div>
  );
}
```

---

## 🆕 New Features for Frontend Integration

### What's New in Version 2.0.0

The following new endpoints and features have been added. Update your frontend to take advantage of these capabilities:

#### 1. PDF Operations (New Endpoints)

**Endpoints to Add**:

- `POST /api/files/pdf/merge` - Merge multiple PDFs
- `POST /api/files/pdf/split` - Split PDF by pages
- `POST /api/files/pdf/fill-form` - Fill PDF form fields

**Frontend Integration**:

```typescript
// Merge PDFs
const mergedPdf = await FileConverterAPI.mergePdfs({
  files: [pdf1, pdf2, pdf3],
});

// Split PDF
const splitPdf = await FileConverterAPI.splitPdf({
  file: pdfFile,
  splitFrom: 1,
  splitTo: 10,
});

// Fill PDF Form
const filledPdf = await FileConverterAPI.fillPdfForm({
  file: formPdf,
  formData: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});
```

#### 2. Excel Chart Export (New Endpoint)

**Endpoint to Add**:

- `POST /api/files/excel/export-chart` - Export Excel chart as PNG

**Frontend Integration**:

```typescript
const chartImage = await FileConverterAPI.exportExcelChart({
  file: excelFile,
  sheetName: 'Sheet1',
  chartIndex: 0,
});
```

#### 3. Presentations API (New Module)

**Endpoints to Add**:

- `POST /api/presentations/create` - Create PPTX from data
- `POST /api/presentations/convert` - Convert PPTX to PDF/images

**Frontend Integration**:

```typescript
// Create PPTX
const pptx = await FileConverterAPI.createPresentation({
  title: 'My Presentation',
  slides: [
    { title: 'Slide 1', content: 'Content here' },
    { title: 'Slide 2', bullets: ['Point 1', 'Point 2'] },
  ],
});

// Convert PPTX to PDF
const pdf = await FileConverterAPI.convertPresentation({
  file: pptxFile,
  targetFormat: 'pdf',
});
```

**Important**: PPTX conversion requires LibreOffice on the server. Check server setup.

#### 4. Ebooks API (New Module)

**Endpoints to Add**:

- `POST /api/ebooks/create` - Create EPUB from HTML/TXT
- `POST /api/ebooks/convert` - Convert EPUB to PDF/HTML/TXT

**Frontend Integration**:

```typescript
// Create EPUB
const epub = await FileConverterAPI.createEbook({
  title: 'My Book',
  author: 'Author Name',
  content: '<h1>Chapter 1</h1><p>Content...</p>',
  sourceFormat: 'html',
});

// Convert EPUB
const pdf = await FileConverterAPI.convertEbook({
  file: epubFile,
  targetFormat: 'pdf',
});
```

#### 5. Video Enhancements (New Endpoints)

**Endpoints to Add**:

- `POST /api/media/thumbnail` - Generate video thumbnail
- `POST /api/media/trim` - Trim/cut video
- `POST /api/media/merge` - Merge multiple videos
- `POST /api/media/extract-frame` - Extract frame from video
- `POST /api/media/subtitles` - Extract/embed subtitles
- `POST /api/media/transcribe` - Transcribe video to text using speech recognition

**Frontend Integration**:

```typescript
// Generate thumbnail
const thumbnail = await FileConverterAPI.generateThumbnail({
  file: videoFile,
  time: 5,
  format: 'png',
});

// Trim video
const trimmed = await FileConverterAPI.trimVideo({
  file: videoFile,
  startTime: 10,
  endTime: 60,
});

// Merge videos
const merged = await FileConverterAPI.mergeVideos({
  files: [video1, video2, video3],
});

// Extract frame
const frame = await FileConverterAPI.extractFrame({
  file: videoFile,
  time: 5.5,
  format: 'png',
});

// Handle subtitles
const subtitles = await FileConverterAPI.handleSubtitles({
  file: videoFile,
  operation: 'extract',
  format: 'srt',
});

// Transcribe video to text
const transcription = await FileConverterAPI.transcribeVideo({
  file: videoFile,
  language: 'en',
  outputFormat: 'txt',
});

// Transcribe to SRT format
const srtSubtitles = await FileConverterAPI.transcribeVideo({
  file: videoFile,
  outputFormat: 'srt',
});

// Transcribe to JSON with timestamps
const transcriptionData = (await FileConverterAPI.transcribeVideo({
  file: videoFile,
  outputFormat: 'json',
})) as TranscriptionSegment[];
// Returns: [{ start: "00:00:14.310", end: "00:00:16.480", speech: "text" }]
```

#### 6. 3D Model Enhancements (New Endpoint)

**Endpoint to Add**:

- `POST /api/3d/extract` - Extract textures, animations, or materials

**Updated Format Support**:

- Added: `fbx`, `stl`, `ply` to existing `glb`, `gltf`, `obj`, `usdz`

**Frontend Integration**:

```typescript
// Extract 3D data
const textures = await FileConverterAPI.extract3DData({
  file: glbFile,
  extractType: 'textures',
});

// Returns JSON with texture metadata
const json = await textures.text();
const data = JSON.parse(json);
```

### TypeScript Types to Add

Add these new types to your frontend TypeScript definitions:

```typescript
// PDF Operations
export interface MergePdfRequest {
  files: File[];
}

export interface SplitPdfRequest {
  file: File;
  splitFrom?: number;
  splitTo?: number;
  splitAt?: string;
}

export interface FillPdfFormRequest {
  file: File;
  formData: string; // JSON string
}

// Excel Operations
export interface ExportExcelChartRequest {
  file: File;
  sheetName?: string;
  chartIndex?: number;
}

// Presentations
export interface CreatePresentationRequest {
  title: string;
  slides: Array<{
    title: string;
    content?: string;
    bullets?: string[];
  }>;
}

export interface ConvertPresentationRequest {
  file: File;
  targetFormat: 'pdf' | 'png' | 'jpeg';
}

// Ebooks
export interface CreateEbookRequest {
  title: string;
  author: string;
  content: string;
  sourceFormat: 'html' | 'txt';
}

export interface ConvertEbookRequest {
  file: File;
  targetFormat: 'pdf' | 'html' | 'txt';
}

// Video Enhancements
export interface GenerateThumbnailRequest {
  file: File;
  time?: number;
  format?: 'png' | 'jpeg';
}

export interface TrimVideoRequest {
  file: File;
  startTime: number;
  endTime: number;
  targetFormat?: string;
}

export interface MergeVideosRequest {
  files: File[];
}

export interface ExtractFrameRequest {
  file: File;
  time?: number;
  frameNumber?: number;
  format?: 'png' | 'jpeg';
}

export interface SubtitleOperationRequest {
  file: File;
  operation: 'extract' | 'embed';
  subtitleFile?: File;
  subtitleText?: string;
  format?: 'srt' | 'vtt' | 'ass';
}

export interface TranscribeVideoRequest {
  file: File;
  language?: string; // Language code (e.g., 'en', 'fr', 'es')
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json'; // Default: 'txt'
}

export interface TranscriptionSegment {
  start: string; // Timestamp in format "HH:MM:SS.mmm"
  end: string; // Timestamp in format "HH:MM:SS.mmm"
  speech: string; // Transcribed text
}

// 3D Model Extraction
export interface Extract3DDataRequest {
  file: File;
  extractType: 'textures' | 'animations' | 'materials';
}

// Updated 3D Format
export type ThreeDFormat =
  | 'glb'
  | 'gltf'
  | 'obj'
  | 'usdz'
  | 'fbx'
  | 'stl'
  | 'ply';
```

### Migration Guide

1. **Update API Client**: Add new methods to your `FileConverterAPI` class (see examples above)
2. **Add Type Definitions**: Include new TypeScript types in your types file
3. **Update UI Components**: Add UI for new features:
   - PDF merge/split/fill-form buttons
   - Excel chart export button
   - Presentation creation form
   - EPUB creation form
   - Video enhancement controls (thumbnail, trim, merge, etc.)
   - 3D data extraction options
4. **Handle New Response Types**:
   - PPTX to images may return ZIP for multi-slide presentations
   - 3D extraction returns JSON files
   - Subtitle extraction returns text files

### Breaking Changes

None. All existing endpoints remain unchanged. New features are additive.

---

## Need Help?

- **Swagger UI**: Visit `http://localhost:3001/api/docs` for interactive API documentation
- **GitHub Issues**: Report bugs or request features
- **Email**: mu

---

---

## System Requirements

### LibreOffice (Required for PPTX Conversion)

The PPTX to PDF/Image conversion feature requires LibreOffice to be installed on the server.

**Installation**:

- **Ubuntu/Debian**: `apt-get update && apt-get install -y libreoffice`
- **macOS**: `brew install libreoffice`
- **Docker**: Add to Dockerfile:
  ```dockerfile
  RUN apt-get update && apt-get install -y libreoffice && rm -rf /var/lib/apt/lists/*
  ```

**Note**: Without LibreOffice, PPTX conversion endpoints will fail. The `createPresentation` endpoint (creating PPTX from data) does not require LibreOffice.

### Whisper Models (Required for Video Transcription)

The video transcription feature requires Whisper models to be downloaded first.

**Installation**:

```bash
npx whisper-node download
```

When prompted, select a model:

- **Recommended**: `base` - Good balance of speed and accuracy, supports multiple languages (142 MB disk, ~500 MB RAM)
- **Fastest**: `tiny` or `tiny.en` - Faster processing, lower accuracy (75 MB disk, ~390 MB RAM)
- **Best Accuracy**: `large` - Highest accuracy, slower processing (2.9 GB disk, ~4.7 GB RAM)

**Note**: Without Whisper models, video transcription endpoints will fail. Models are stored locally and used for all transcription requests.

---

## New Features Summary

### ✨ Recently Added Features

1. **PDF Operations**:
   - Merge multiple PDFs
   - Split PDFs by pages
   - Fill PDF form fields

2. **Excel Chart Export**:
   - Export Excel charts as PNG images
   - Automatic chart generation from worksheet data

3. **Presentations**:
   - Create PPTX from structured data
   - Convert PPTX to PDF or images (PNG/JPEG)

4. **Ebooks**:
   - Create EPUB from HTML/TXT
   - Convert EPUB to PDF, HTML, or TXT

5. **Video Enhancements**:
   - Generate thumbnails
   - Trim/cut videos
   - Merge multiple videos
   - Extract frames
   - Extract/embed subtitles
   - Transcribe videos to text (speech recognition)

6. **3D Model Enhancements**:
   - Extract textures metadata
   - Extract animations metadata
   - Extract materials metadata
   - Support for FBX, STL, PLY formats

---

**Last Updated**: 2025
**API Version**: 1.0.0
