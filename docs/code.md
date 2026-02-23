# Code Module

Format and syntax-highlight code files.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/code/format` | Format and/or highlight code |

## POST `/api/code/format`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Code file |
| `language` | string | No | Programming language |
| `outputFormat` | string | No | `formatted` or `html` (default: formatted) |

### Supported Languages

`javascript`, `typescript`, `python`, `java`, `csharp`, `cpp`, `go`, `rust`, `php`, `ruby`, `html`, `css`, `json`, `sql`

### Output Formats

- **`formatted`**: Prettified code using Prettier
- **`html`**: Syntax-highlighted HTML page using highlight.js

### Examples

```bash
# Format code
curl -X POST http://localhost:4001/api/code/format \
  -F "file=@script.js" \
  -F "language=javascript" \
  -F "outputFormat=formatted" \
  --output formatted.js

# Syntax highlight to HTML
curl -X POST http://localhost:4001/api/code/format \
  -F "file=@script.py" \
  -F "language=python" \
  -F "outputFormat=html" \
  --output highlighted.html
```
