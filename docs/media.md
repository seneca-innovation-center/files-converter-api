# Media Module

Video and audio conversion, transcription, thumbnails, trimming, merging, frame extraction, and subtitle handling.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/media/convert` | Convert video/audio formats |
| POST | `/api/media/extract-audio` | Extract audio from video |
| POST | `/api/media/thumbnail` | Generate video thumbnail |
| POST | `/api/media/trim` | Trim/cut video |
| POST | `/api/media/merge` | Merge multiple videos |
| POST | `/api/media/extract-frame` | Extract single frame |
| POST | `/api/media/subtitles` | Extract or embed subtitles |
| POST | `/api/media/transcribe` | Transcribe video to text |

## POST `/api/media/convert`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Media file (max 200MB) |
| `targetFormat` | string | Yes | Target format |
| `videoCodec` | string | No | e.g. `libx264`, `libx265` |
| `audioCodec` | string | No | e.g. `aac`, `libmp3lame` |
| `audioBitrate` | string | No | e.g. `192k`, `320k` |
| `videoBitrate` | string | No | e.g. `1000k`, `2000k` |
| `width` | number | No | Output width (1-4096) |
| `height` | number | No | Output height (1-4096) |

**Supported formats**: MP4, WebM, AVI, MOV, MKV, GIF, MP3, WAV, OGG, FLAC, AAC, M4A

```bash
curl -X POST http://localhost:4001/api/media/convert \
  -F "file=@video.avi" \
  -F "targetFormat=mp4" \
  --output video.mp4
```

## POST `/api/media/extract-audio`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file |
| `format` | string | Yes | Audio format: `mp3`, `wav`, `aac`, `flac` |

```bash
curl -X POST http://localhost:4001/api/media/extract-audio \
  -F "file=@video.mp4" \
  -F "format=mp3" \
  --output audio.mp3
```

## POST `/api/media/thumbnail`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file |
| `time` | number | No | Time in seconds (default: 0) |
| `format` | string | No | `png` or `jpeg` (default: png) |

```bash
curl -X POST http://localhost:4001/api/media/thumbnail \
  -F "file=@video.mp4" \
  -F "time=5" \
  --output thumb.png
```

## POST `/api/media/trim`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file |
| `startTime` | number | Yes | Start time in seconds |
| `endTime` | number | Yes | End time in seconds |

```bash
curl -X POST http://localhost:4001/api/media/trim \
  -F "file=@video.mp4" \
  -F "startTime=10" \
  -F "endTime=60" \
  --output trimmed.mp4
```

## POST `/api/media/merge`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Multiple video files (in order) |

```bash
curl -X POST http://localhost:4001/api/media/merge \
  -F "files=@part1.mp4" \
  -F "files=@part2.mp4" \
  --output merged.mp4
```

## POST `/api/media/extract-frame`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file |
| `time` | number | No | Time in seconds |
| `frameNumber` | number | No | Frame number (alternative to time) |
| `format` | string | No | `png` or `jpeg` (default: png) |

```bash
curl -X POST http://localhost:4001/api/media/extract-frame \
  -F "file=@video.mp4" \
  -F "time=5.5" \
  --output frame.png
```

## POST `/api/media/subtitles`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file |
| `operation` | string | Yes | `extract` or `embed` |
| `subtitleFile` | File | No | Subtitle file for embedding |
| `subtitleText` | string | No | Subtitle text for embedding |
| `format` | string | No | `srt`, `vtt`, or `ass` (default: srt) |

```bash
# Extract subtitles
curl -X POST http://localhost:4001/api/media/subtitles \
  -F "file=@video.mp4" \
  -F "operation=extract" \
  --output subtitles.srt

# Embed subtitles
curl -X POST http://localhost:4001/api/media/subtitles \
  -F "file=@video.mp4" \
  -F "operation=embed" \
  -F "subtitleFile=@subs.srt" \
  --output video-with-subs.mp4
```

## POST `/api/media/transcribe`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video or audio file |
| `language` | string | No | Language code (`en`, `fr`, `ar`, etc.). Auto-detects if omitted |
| `outputFormat` | string | No | `txt`, `srt`, `vtt`, or `json` (default: txt) |

**Response**: Transcription file. For text formats, the content is also returned in the response header.

```bash
# Plain text
curl -X POST http://localhost:4001/api/media/transcribe \
  -F "file=@video.mp4" \
  -F "outputFormat=txt" \
  --output transcription.txt

# SRT subtitles
curl -X POST http://localhost:4001/api/media/transcribe \
  -F "file=@video.mp4" \
  -F "language=en" \
  -F "outputFormat=srt" \
  --output transcription.srt

# JSON with timestamps
curl -X POST http://localhost:4001/api/media/transcribe \
  -F "file=@video.mp4" \
  -F "outputFormat=json" \
  --output transcription.json
```

### Notes

- Requires FFmpeg (installed via system package in Docker)
- Transcription uses `@huggingface/transformers` with `whisper-large-v3-turbo` model (auto-downloaded on first use)
- Audio is extracted as 16kHz mono WAV before transcription
