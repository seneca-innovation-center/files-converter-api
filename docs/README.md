# API Modules Documentation

Per-module documentation for the Files Converter API.

| Module | Description | Endpoints |
|--------|-------------|-----------|
| [Images](images.md) | Image format conversion, resizing, background removal, SVG vectorization | 1 |
| [Files](files.md) | Document conversion (DOCX, PDF, XLSX, CSV), PDF operations, Excel charts | 5 |
| [Media](media.md) | Video/audio conversion, transcription, thumbnails, trimming, subtitles | 8 |
| [3D Models](3d.md) | 3D model conversion (GLB, GLTF, OBJ, STL, PLY, FBX) and data extraction | 2 |
| [Archives](archives.md) | Create and extract ZIP, TAR, TAR.GZ archives | 2 |
| [QR & Barcodes](qr.md) | QR code and barcode generation | 2 |
| [Markdown](markdown.md) | Markdown to HTML/PDF, HTML to Markdown | 2 |
| [OCR](ocr.md) | Text extraction from images using Tesseract | 1 |
| [Code](code.md) | Code formatting and syntax highlighting | 1 |
| [Presentations](presentations.md) | PPTX creation and conversion | 2 |
| [Ebooks](ebooks.md) | EPUB creation and conversion | 2 |
| [Auth](auth.md) | Authentication via Better Auth (OAuth, email/password) | 1 (proxy) |
| [Users](users.md) | User management and role-based access | 4 |
| [Mail](mail.md) | Email sending (internal service, no endpoints) | 0 |

All endpoints are prefixed with `/api` and require Bearer token authentication unless noted otherwise.

## Guides

| Guide | Description |
|-------|-------------|
| [Deployment](deployment.md) | Server setup, GitHub Actions secrets, Docker deployment |
