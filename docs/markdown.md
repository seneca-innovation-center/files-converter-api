# Markdown Module

Convert Markdown to HTML/PDF and HTML to Markdown.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/markdown/convert` | Convert Markdown to HTML or PDF |
| POST | `/api/markdown/html-to-markdown` | Convert HTML to Markdown |

## POST `/api/markdown/convert`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Markdown file (.md) |
| `targetFormat` | string | Yes | `html` or `pdf` |

```bash
curl -X POST http://localhost:4001/api/markdown/convert \
  -F "file=@README.md" \
  -F "targetFormat=pdf" \
  --output readme.pdf
```

## POST `/api/markdown/html-to-markdown`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | HTML file |

```bash
curl -X POST http://localhost:4001/api/markdown/html-to-markdown \
  -F "file=@page.html" \
  --output page.md
```

### Notes

- Markdown parsing uses `marked`
- HTML to Markdown uses `turndown`
- PDF generation uses `html-pdf-node`
