# OCR Module

Extract text from images using Tesseract OCR with multi-language support.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ocr/extract` | Extract text from image |

## POST `/api/ocr/extract`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (PNG, JPG, etc.) |
| `language` | string | No | Language code (default: `eng`) |
| `outputFormat` | string | No | `txt` or `json` (default: txt) |

### Supported Languages

| Code | Language |
|------|----------|
| `eng` | English |
| `fra` | French |
| `deu` | German |
| `spa` | Spanish |
| `ita` | Italian |
| `por` | Portuguese |
| `rus` | Russian |
| `chi_sim` | Chinese (Simplified) |
| `jpn` | Japanese |
| `kor` | Korean |
| `ara` | Arabic |

### Response

**TXT format**: Plain text file.

**JSON format**:
```json
{
  "text": "Extracted text content...",
  "confidence": 95.4
}
```

### Examples

```bash
# Extract as text
curl -X POST http://localhost:4001/api/ocr/extract \
  -F "file=@document.jpg" \
  -F "language=eng" \
  --output extracted.txt

# Extract as JSON
curl -X POST http://localhost:4001/api/ocr/extract \
  -F "file=@document.jpg" \
  -F "language=fra" \
  -F "outputFormat=json"
```

### Notes

- Uses Tesseract.js (WASM-based, no system dependencies)
- Language models are downloaded automatically
