# Product Launch Video Example

**Use case**: Generate a 30-second SaaS product launch video.

## What this example demonstrates

This is a complete Code2MP4 project for a fictional SaaS product launch. It shows:

1. **Storyboard-first workflow** — the `storyboard.json` defines every scene before any code is written
2. **Multi-scene structure** — problem → promise → features → CTA (4 scenes)
3. **Motion system** — uses the "Tech" direction (dark canvas, neon accents, monospace display)
4. **Deterministic output** — same storyboard + motion system = same MP4 every time

## Contents

```
product-launch/
  storyboard.json    — structured scene plan
  src/                — (generated) HyperFrames HTML fragments
  output/             — (generated) rendered MP4
  README.md           — this file
```

## Storyboard structure

| Scene | Duration | Goal |
|---|---|---|
| Problem | 5s | Hook — establish the pain point |
| Promise | 5s | Reveal the product as solution |
| Features | 15s | Demonstrate key features with callouts |
| CTA | 5s | Drive sign-up action |

## How to use this example

1. Read `storyboard.json` to understand the structure
2. Run the Code2MP4 pipeline with the "product-launch" video skill selected
3. The Director Agent uses this storyboard as the target format
4. Scene Agents generate motion source for each scene
5. Assembly combines scenes, Render produces the MP4

## Expected output

- Storyboard: `storyboard.json` (this file)
- Motion source: `src/index.html` (HyperFrames composition)
- Rendered video: `output/output.mp4` (1920×1080, 30fps)
