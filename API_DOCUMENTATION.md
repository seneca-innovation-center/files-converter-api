# Files Converter API - Frontend Integration Guide

**Base URL**: `http://localhost:3001/api`

**Swagger Documentation**: `http://localhost:3001/api/docs`

## Table of Contents

1. [Images API](#images-api)
2. [Documents API](#documents-api)
3. [3D Models API](#3d-models-api)
4. [Video & Audio API](#video--audio-api)
5. [QR Codes & Barcodes API](#qr-codes--barcodes-api)
6. [Archives API](#archives-api)
7. [Markdown API](#markdown-api)
8. [OCR API](#ocr-api)
9. [Code Formatting API](#code-formatting-api)
10. [TypeScript Types](#typescript-types)

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
type ThreeDFormat = 'glb' | 'gltf' | 'obj' | 'usdz';
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

export type ThreeDFormat = 'glb' | 'gltf' | 'obj' | 'usdz';

export interface ThreeDConvertRequest {
  file: File;
  format: ThreeDFormat;
  optimize?: boolean;
  compress?: boolean;
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

## Need Help?

- **Swagger UI**: Visit `http://localhost:3001/api/docs` for interactive API documentation
- **GitHub Issues**: Report bugs or request features
- **Email**: support@yourapi.com

---

**Last Updated**: 2024
**API Version**: 1.0.0
