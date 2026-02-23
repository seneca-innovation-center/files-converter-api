# QR & Barcodes Module

Generate QR codes and barcodes with customizable options.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/qr/generate` | Generate QR code |
| POST | `/api/qr/barcode` | Generate barcode |

## POST `/api/qr/generate`

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | string | Yes | Text or URL to encode |
| `size` | number | No | Size in pixels (100-2000, default: 300) |
| `color` | string | No | Foreground color hex (default: `#000000`) |
| `backgroundColor` | string | No | Background color hex (default: `#FFFFFF`) |
| `errorCorrectionLevel` | string | No | `L`, `M`, `Q`, or `H` (default: M) |

**Response**: PNG image.

```bash
curl -X POST http://localhost:4001/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"data":"https://example.com","size":400}' \
  --output qrcode.png
```

## POST `/api/qr/barcode`

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | string | Yes | Data to encode |
| `format` | string | Yes | `CODE128`, `EAN13`, `EAN8`, `UPC`, `CODE39`, `ITF14`, `MSI`, `pharmacode` |
| `width` | number | No | Width in pixels (100-1000, default: 200) |
| `height` | number | No | Height in pixels (50-500, default: 100) |
| `displayValue` | boolean | No | Show text below barcode (default: true) |

**Response**: PNG image.

```bash
curl -X POST http://localhost:4001/api/qr/barcode \
  -H "Content-Type: application/json" \
  -d '{"data":"1234567890123","format":"EAN13"}' \
  --output barcode.png
```
