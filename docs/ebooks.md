# Ebooks Module

Create EPUB ebooks from HTML/TXT content and convert EPUB to other formats.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ebooks/create` | Create EPUB from content |
| POST | `/api/ebooks/convert` | Convert EPUB to PDF/HTML/TXT |

## POST `/api/ebooks/create`

**Content-Type**: `application/json`

```json
{
  "title": "My Book",
  "author": "Author Name",
  "content": "<h1>Chapter 1</h1><p>Content here...</p>",
  "sourceFormat": "html"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Book title |
| `author` | string | No | Author name |
| `content` | string | Yes | Book content (HTML or plain text) |
| `sourceFormat` | string | No | `html` or `txt` (default: html) |

**Response**: EPUB file.

```bash
curl -X POST http://localhost:4001/api/ebooks/create \
  -H "Content-Type: application/json" \
  -d '{"title":"My Book","author":"Author","content":"<h1>Ch1</h1><p>Text</p>","sourceFormat":"html"}' \
  --output book.epub
```

## POST `/api/ebooks/convert`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | EPUB file (max 200MB) |
| `targetFormat` | string | Yes | `pdf`, `html`, or `txt` |

```bash
curl -X POST http://localhost:4001/api/ebooks/convert \
  -F "file=@book.epub" \
  -F "targetFormat=pdf" \
  --output book.pdf
```

### Notes

- EPUB creation uses `epub-gen`
- EPUB parsing uses `epub-parser`
- Text content is preserved; complex formatting may not carry over
