# Open Source Project Intro Video Example

**Use case**: Turn a GitHub README into a 30-second project introduction video.

## What this example demonstrates

This example uses Code2MP4 itself as the subject — showing how any open-source project can generate an intro video from its README. It demonstrates:

1. **Self-referential demo** — Code2MP4 generating a video about Code2MP4
2. **Docs-to-video pipeline** — structured content extracted from README into storyboard
3. **OSS-optimized messaging** — what → why → how → get started structure
4. **Minimal visual design** — clean, typography-forward, framework-agnostic

## Contents

```
oss-intro/
  storyboard.json    — structured scene plan
  src/                — (generated) HyperFrames HTML fragments
  output/             — (generated) rendered MP4
  README.md           — this file
```

## Storyboard structure

| Scene | Duration | Goal |
|---|---|---|
| What | 7s | Explain what the project does in one sentence |
| Why | 7s | Why it exists — the problem it solves |
| How | 10s | Architecture overview with key concepts |
| Get Started | 6s | Three commands to start using it |

## How to use this example

1. Replace the content in `storyboard.json` with your own project's info
2. Keep the scene structure (what → why → how → get started)
3. Run the Code2MP4 pipeline with motion system "editorial" for a warm, refined look
4. The video is ready to embed in your README

## Expected output

- Storyboard: `storyboard.json` (this file)
- Motion source: `src/index.html` (HyperFrames composition)
- Rendered video: `output/output.mp4` (1920×1080, 30fps)
