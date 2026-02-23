# Images Module

Image format conversion with optional resizing, AI background removal, and SVG vectorization.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/images/convert` | Convert image to a different format |

## POST `/api/images/convert`

**Content-Type**: `multipart/form-data`

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (max 200MB) |
| `format` | string | Yes | Target format: `jpeg`, `png`, `webp`, `avif`, `tiff`, `bmp`, `svg` |
| `width` | number | No | Resize width (1-10000 px) |
| `height` | number | No | Resize height (1-10000 px) |
| `quality` | number | No | Quality 1-100 (JPEG/WebP only) |
| `removeBackground` | boolean | No | AI background removal |
| `colorVectorization` | boolean | No | Color SVG vectorization (when converting to SVG) |

### Supported Conversions

- **To SVG** (vectorization): PNG, JPG, WEBP, AVIF, TIFF, BMP -> SVG
- **From SVG** (rasterization): SVG -> PNG, JPG, WEBP, AVIF, TIFF, BMP
- **Raster to raster**: All combinations between JPEG, PNG, WEBP, AVIF, TIFF, BMP

### Response

Binary image file with appropriate `Content-Type` header.

### Examples

```bash
# Convert PNG to WebP
curl -X POST http://localhost:4001/api/images/convert \
  -F "file=@image.png" \
  -F "format=webp" \
  -F "quality=80" \
  --output image.webp

# Resize and remove background
curl -X POST http://localhost:4001/api/images/convert \
  -F "file=@photo.jpg" \
  -F "format=png" \
  -F "width=800" \
  -F "removeBackground=true" \
  --output photo-nobg.png

# Vectorize to SVG
curl -X POST http://localhost:4001/api/images/convert \
  -F "file=@logo.png" \
  -F "format=svg" \
  --output logo.svg
```

### Notes

- SVG vectorization works best with high-contrast, simple images (logos, icons, line art)
- Background removal uses ONNX models via `@imgly/background-removal-node`
- Image processing powered by Sharp
