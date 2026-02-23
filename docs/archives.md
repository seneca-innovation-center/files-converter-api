# Archives Module

Create and extract ZIP, TAR, and TAR.GZ archives.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/archives/create` | Create archive from files |
| POST | `/api/archives/extract` | Extract archive contents |

## POST `/api/archives/create`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Files to archive |
| `format` | string | Yes | `zip`, `tar`, or `tar.gz` |
| `compressionLevel` | number | No | 0-9 (ZIP only, default: 6) |

```bash
curl -X POST http://localhost:4001/api/archives/create \
  -F "files=@file1.txt" \
  -F "files=@file2.pdf" \
  -F "format=zip" \
  --output archive.zip
```

## POST `/api/archives/extract`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Archive file (ZIP, TAR, or TAR.GZ) |

**Response**: JSON with extracted file information and base64-encoded contents.

```json
{
  "success": true,
  "filesCount": 2,
  "files": [
    { "filename": "file1.txt", "size": 1024, "data": "base64..." },
    { "filename": "file2.pdf", "size": 2048, "data": "base64..." }
  ]
}
```

```bash
curl -X POST http://localhost:4001/api/archives/extract \
  -F "file=@archive.zip"
```
