# Render Configuration (`render.config.json`)

The render config controls how a scene composition is rendered to MP4. It is the execution layer that sits between the creative source (scene HTML) and the deterministic output (MP4 file).

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Render Config",
  "type": "object",
  "required": ["compositionDir", "output"],
  "properties": {
    "compositionDir": {
      "type": "string",
      "description": "Path to the HyperFrames composition directory containing index.html"
    },
    "output": {
      "type": "string",
      "description": "Output file path (relative to project root)"
    },
    "engine": {
      "type": "string",
      "enum": ["hyperframes", "remotion"],
      "default": "hyperframes",
      "description": "Render engine to use"
    },
    "quality": {
      "type": "string",
      "enum": ["draft", "standard", "high"],
      "default": "standard",
      "description": "Render quality preset"
    },
    "fps": {
      "type": "number",
      "minimum": 12,
      "maximum": 60,
      "default": 30,
      "description": "Frames per second"
    },
    "resolution": {
      "type": "string",
      "enum": ["hd", "fhd", "4k"],
      "default": "fhd",
      "description": "Output resolution preset"
    },
    "format": {
      "type": "string",
      "enum": ["mp4", "webm"],
      "default": "mp4",
      "description": "Output container format"
    },
    "codec": {
      "type": "string",
      "enum": ["h264", "h265", "vp9"],
      "default": "h264",
      "description": "Video codec"
    },
    "audio": {
      "type": "object",
      "properties": {
        "codec": { "type": "string", "enum": ["aac", "opus"], "default": "aac" },
        "bitrate": { "type": "string", "default": "128k" },
        "sampleRate": { "type": "number", "default": 48000 }
      }
    },
    "variables": {
      "type": "object",
      "description": "Composition variable overrides (passed via --variables flag)",
      "additionalProperties": { "type": "string" }
    },
    "variant": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "description": "Variant name (e.g., 'short-15s', 'portrait')" },
        "parent": { "type": "string", "description": "Parent config this variant derives from" }
      }
    },
    "preCheck": {
      "type": "object",
      "properties": {
        "lint": { "type": "boolean", "default": true },
        "validate": { "type": "boolean", "default": false },
        "inspect": { "type": "boolean", "default": true }
      }
    }
  }
}
```

## Resolution presets

| Preset | Width | Height | Use case |
|---|---|---|---|
| `hd` | 1280 | 720 | Draft renders, quick previews |
| `fhd` | 1920 | 1080 | Standard render (16:9 landscape) |
| `4k` | 3840 | 2160 | High-quality archival, client delivery |

Note: portrait compositions use the same width/height swapped. For example, 9:16 FHD would be 1080×1920.

## Quality presets

| Preset | CRF | Bitrate | Frame capture | Best for |
|---|---|---|---|---|
| `draft` | 28 | 2M | Screenshot mode | Fast iteration, checking timing |
| `standard` | 23 | 8M | Headless frame capture | Release output, demos |
| `high` | 18 | 16M | Frame capture + anti-banding | Final delivery, client review |

## Example: Standard render

```json
{
  "compositionDir": "projects/widgetx-v2/.hf-cache/v3",
  "output": "output.mp4",
  "engine": "hyperframes",
  "quality": "standard",
  "fps": 30,
  "resolution": "fhd",
  "format": "mp4",
  "codec": "h264",
  "audio": {
    "codec": "aac",
    "bitrate": "128k"
  },
  "preCheck": {
    "lint": true,
    "inspect": true
  }
}
```

## Example: Variant renders (batch)

```json
[
  {
    "compositionDir": "projects/widgetx-v2/.hf-cache/v3",
    "output": "output-16x9-30s.mp4",
    "quality": "standard",
    "fps": 30,
    "resolution": "fhd",
    "variant": { "name": "landscape-30s" }
  },
  {
    "compositionDir": "projects/widgetx-v2/.hf-cache/v3",
    "output": "output-9x16-15s.mp4",
    "quality": "standard",
    "fps": 30,
    "resolution": "hd",
    "variant": { "name": "portrait-15s", "parent": "landscape-30s" }
  },
  {
    "compositionDir": "projects/widgetx-v2/.hf-cache/v3",
    "output": "output-1x1-15s.mp4",
    "quality": "standard",
    "fps": 30,
    "resolution": "hd",
    "variant": { "name": "square-15s", "parent": "landscape-30s" }
  }
]
```

## Render variants strategy

A single composition can produce multiple MP4 variants by varying:

1. **Aspect ratio** — 16:9, 9:16, 1:1, 4:5 for different platforms
2. **Duration** — 15s, 30s, 60s for different use cases
3. **Variables** — different text, colors, or branding via `--variables`
4. **Quality** — draft for iteration, standard for release, high for archival

The variant system avoids duplicating composition source — one source, many outputs.
