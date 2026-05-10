# Quality Checklist (`quality-report.json`)

Code2MP4's quality system — called "Video Review Theater" — is a structured checklist that evaluates every video across 5 dimensions before it leaves the pipeline. It transforms subjective review into machine-checkable gates.

## Philosophy

AI-generated videos fail in predictable ways:

1. **Weak hooks** — the first 3 seconds say nothing
2. **Text overload** — too many words per screen
3. **AI template smell** — generic phrasing, no personality
4. **Platform mismatch** — wrong aspect ratio, unsafe zones
5. **Dead pacing** — no rhythm variation, no peaks

Code2MP4's quality system catches these before render — not after.

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Quality Report",
  "type": "object",
  "required": ["videoId", "passed", "dimensions"],
  "properties": {
    "videoId": { "type": "string" },
    "passed": { "type": "boolean" },
    "dimensions": {
      "type": "object",
      "properties": {
        "hook": { "$ref": "#/$defs/dimension" },
        "script": { "$ref": "#/$defs/dimension" },
        "readability": { "$ref": "#/$defs/dimension" },
        "motion": { "$ref": "#/$defs/dimension" },
        "platform": { "$ref": "#/$defs/dimension" },
        "brand": { "$ref": "#/$defs/dimension" },
        "render": { "$ref": "#/$defs/dimension" }
      }
    },
    "warnings": {
      "type": "array",
      "items": { "$ref": "#/$defs/finding" }
    },
    "errors": {
      "type": "array",
      "items": { "$ref": "#/$defs/finding" }
    },
    "scores": {
      "type": "object",
      "properties": {
        "overall": { "type": "number", "minimum": 0, "maximum": 100 },
        "hook": { "type": "number", "minimum": 0, "maximum": 100 },
        "engagement": { "type": "number", "minimum": 0, "maximum": 100 },
        "clarity": { "type": "number", "minimum": 0, "maximum": 100 },
        "platformFit": { "type": "number", "minimum": 0, "maximum": 100 },
        "brandConsistency": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    }
  },
  "$defs": {
    "dimension": {
      "type": "object",
      "required": ["passed", "checks"],
      "properties": {
        "passed": { "type": "boolean" },
        "checks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "label", "passed"],
            "properties": {
              "id": { "type": "string" },
              "label": { "type": "string" },
              "passed": { "type": "boolean" },
              "detail": { "type": "string" }
            }
          }
        }
      }
    },
    "finding": {
      "type": "object",
      "required": ["check", "severity", "message"],
      "properties": {
        "check": { "type": "string" },
        "severity": { "type": "string", "enum": ["error", "warning"] },
        "message": { "type": "string" },
        "fix": { "type": "string", "description": "Suggested fix" }
      }
    }
  }
}
```

## Checklist dimensions

### 1. Hook (first 3 seconds)

| Check | What it catches |
|---|---|
| `hook-exists` | First segment is a hook (not context or intro) |
| `hook-duration` | Hook duration is 2-4s |
| `hook-type-match` | Hook type matches audience awareness level |
| `hook-words` | Hook text is under 15 words |
| `hook-visual-impact` | First frame has visible text or motion (not a blank fade-in) |

### 2. Script quality

| Check | What it catches |
|---|---|
| `segments-defined` | All segments have type, text, and duration |
| `duration-sum` | Segment durations sum to total |
| `no-segment-over-8s` | No segment exceeds 8 seconds without a visual change |
| `cta-is-last` | CTA/outro is the final segment |
| `voiceover-pace` | Voiceover word count matches speaking pace (120-160 wpm) |
| `no-ai-phrases` | No generic AI phrases ("In today's world", "Revolutionary", "Game-changing") |
| `varied-transitions` | Consecutive segments don't use identical transitions |
| `emotional-arc` | Script has at least one tension peak and one resolution |

### 3. Readability

| Check | What it catches |
|---|---|
| `text-per-screen` | Each screen has ≤ 60 chars (or ≤ 3 lines) |
| `font-minimum` | Body text ≥ 20px, headlines ≥ 60px |
| `no-br-tags` | No forced `<br>` line breaks in body text |
| `contrast-ratio` | Text-to-background contrast ≥ 4.5:1 (WCAG AA) |
| `safe-zone` | All text within 80px safety margin from edges |
| `subtitle-density` | Captions ≤ 2 lines, ≤ 40 chars per line |

### 4. Motion quality

| Check | What it catches |
|---|---|
| `entrance-variety` | Not all elements use the same entrance animation |
| `no-exit-before-transition` | Elements don't exit before the scene transition fires |
| `easing-match` | Easing matches the active motion system |
| `duration-proportional` | Animation durations scale with screen time (not all 0.5s) |
| `no-still-over-2s` | No period > 2s without any motion on screen |
| `gsap-deterministic` | No `Math.random()`, `Date.now()`, or `repeat: -1` in GSAP |

### 5. Platform suitability

| Check | What it catches |
|---|---|
| `aspect-match` | Video aspect ratio matches the brief's target platforms |
| `safe-zone-platform` | Content respects platform-specific safe zones |
| `silent-playback` | Video is legible without audio (if `noAudio: true`) |
| `duration-platform` | Duration is appropriate for target platform |
| `cover-exists` | Cover/thumbnail is generated (if requested) |
| `social-copy-exists` | Social media copy is generated (if requested) |

### 6. Brand consistency

| Check | What it catches |
|---|---|
| `palette-match` | Colors match brand or motion system tokens |
| `font-match` | Fonts match brand or motion system |
| `logo-placement` | Logo is present and correctly positioned (if specified) |
| `tone-match` | Visual tone matches brief's tone setting |

### 7. Render determinism

| Check | What it catches |
|---|---|
| `no-random` | No non-deterministic code in source |
| `assets-local` | All assets are local files (no CDN hotlinks in render) |
| `fps-consistent` | FPS setting matches the timeline's frame rate expectations |
| `lint-pass` | `npx hyperframes lint --json` returns no errors |
| `inspect-pass` | `npx hyperframes inspect --json` returns no overflows |

## Example: Passing quality report

```json
{
  "videoId": "widgetx-v2-launch",
  "passed": true,
  "dimensions": {
    "hook": {
      "passed": true,
      "checks": [
        { "id": "hook-exists", "label": "Hook segment present", "passed": true },
        { "id": "hook-duration", "label": "Hook duration 2-4s", "passed": true, "detail": "3s" },
        { "id": "hook-type-match", "label": "Hook type matches awareness", "passed": true },
        { "id": "hook-words", "label": "Hook under 15 words", "passed": true, "detail": "8 words" },
        { "id": "hook-visual-impact", "label": "First frame has visible content", "passed": true }
      ]
    },
    "script": {
      "passed": true,
      "checks": [
        { "id": "no-ai-phrases", "label": "No generic AI phrasing", "passed": true },
        { "id": "emotional-arc", "label": "Has tension peak and resolution", "passed": true },
        { "id": "duration-sum", "label": "Segments sum to total", "passed": true, "detail": "30s" }
      ]
    },
    "render": {
      "passed": true,
      "checks": [
        { "id": "lint-pass", "label": "HyperFrames lint passed", "passed": true },
        { "id": "inspect-pass", "label": "HyperFrames inspect passed", "passed": true }
      ]
    }
  },
  "warnings": [],
  "errors": [],
  "scores": {
    "overall": 92,
    "hook": 95,
    "engagement": 88,
    "clarity": 94,
    "platformFit": 90,
    "brandConsistency": 93
  }
}
```
