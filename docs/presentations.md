# Presentations Module

Create PPTX presentations from structured data and convert PPTX to PDF or images.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/presentations/create` | Create PPTX from data |
| POST | `/api/presentations/convert` | Convert PPTX to PDF/images |

## POST `/api/presentations/create`

**Content-Type**: `application/json`

```json
{
  "title": "My Presentation",
  "slides": [
    {
      "title": "Slide 1",
      "content": "Main content text",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}
```

**Response**: PPTX file.

```bash
curl -X POST http://localhost:4001/api/presentations/create \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo","slides":[{"title":"Intro","content":"Hello"}]}' \
  --output presentation.pptx
```

## POST `/api/presentations/convert`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PPTX file (max 200MB) |
| `targetFormat` | string | Yes | `pdf`, `png`, or `jpeg` |

**Response**:
- PDF: Single PDF file
- PNG/JPEG: Single image (1 slide) or ZIP (multiple slides)

```bash
curl -X POST http://localhost:4001/api/presentations/convert \
  -F "file=@slides.pptx" \
  -F "targetFormat=pdf" \
  --output slides.pdf
```

### Notes

- PPTX creation uses `pptxgenjs` (no system dependencies)
- PPTX conversion requires LibreOffice installed on the server
