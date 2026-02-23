# Files Module

Document conversion between formats, PDF operations (merge, split, fill forms), and Excel chart export.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files/convert` | Convert documents between formats |
| POST | `/api/files/pdf/merge` | Merge multiple PDFs |
| POST | `/api/files/pdf/split` | Split PDF by pages |
| POST | `/api/files/pdf/fill-form` | Fill PDF form fields |
| POST | `/api/files/excel/export-chart` | Export Excel chart as PNG |

## POST `/api/files/convert`

**Content-Type**: `multipart/form-data`

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Document file (max 200MB) |
| `targetFormat` | string | Yes | Target format extension |
| `options` | string | No | Additional options (JSON string) |

### Supported Conversions

| Source | Target |
|--------|--------|
| DOCX | PDF, TXT, HTML |
| PDF | TXT, DOCX |
| XLSX | CSV, TXT, PDF |
| CSV | XLSX, PDF |
| TXT | PDF |
| HTML | PDF |

### Example

```bash
curl -X POST http://localhost:4001/api/files/convert \
  -F "file=@document.docx" \
  -F "targetFormat=pdf" \
  --output document.pdf
```

## POST `/api/files/pdf/merge`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Multiple PDF files (in order) |

```bash
curl -X POST http://localhost:4001/api/files/pdf/merge \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  --output merged.pdf
```

## POST `/api/files/pdf/split`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF to split |
| `splitFrom` | number | No | Start page (1-indexed) |
| `splitTo` | number | No | End page (1-indexed) |
| `splitAt` | string | No | Split at page numbers (comma-separated, e.g. `"5,10,15"`) |

```bash
curl -X POST http://localhost:4001/api/files/pdf/split \
  -F "file=@document.pdf" \
  -F "splitFrom=1" \
  -F "splitTo=10" \
  --output pages-1-10.pdf
```

## POST `/api/files/pdf/fill-form`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF with form fields |
| `formData` | string | Yes | JSON string of field values |

```bash
curl -X POST http://localhost:4001/api/files/pdf/fill-form \
  -F "file=@form.pdf" \
  -F 'formData={"name":"John Doe","email":"john@example.com"}' \
  --output filled.pdf
```

## POST `/api/files/excel/export-chart`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Excel file |
| `sheetName` | string | No | Sheet name (defaults to first) |
| `chartIndex` | number | No | Chart index (defaults to 0) |

```bash
curl -X POST http://localhost:4001/api/files/excel/export-chart \
  -F "file=@spreadsheet.xlsx" \
  --output chart.png
```

### Notes

- PDF to DOCX extracts text only; complex layouts may not be preserved
- Excel chart export uses Chart.js to render charts from worksheet data
- PDF form filling flattens the form (non-editable output)
