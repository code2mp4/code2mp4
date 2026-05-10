# Product Launch Template

A 30-second product launch video template. Problem → Promise → Features → CTA.

## Quick start

```bash
code2mp4 create --template product-launch --name "my-product-launch"
```

Or copy this directory:
```bash
cp -r templates/product-launch projects/my-product/
```

## What you provide

- Product name
- One-sentence description
- Pain point it solves
- 3 key features
- Call to action text

## What you get

- `brief.json` — pre-filled video brief
- `script.json` — pre-structured script with hook and segment timing
- `storyboard.json` — scene plan for Agent to execute
- `scene-template.html` — HyperFrames HTML template with motion system tokens
- `quality-checklist.md` — review gates before render

## Scene structure

| Scene | Duration | Type | Default content |
|---|---|---|---|
| 1. Problem | 5s | hook | "{{problem}}" |
| 2. Promise | 5s | promise | "{{product-name}} ships your code in 60 seconds." |
| 3. Feature 1 | 6s | feature | "{{feature-1}}" |
| 4. Feature 2 | 6s | feature | "{{feature-2}}" |
| 5. Feature 3 | 4s | feature | "{{feature-3}}" |
| 6. CTA | 4s | cta | "{{cta-text}}" |

## Related
- Example: [examples/product-launch/](../../examples/product-launch/)
- Skill: [video-skills/product-launch-video/](../../video-skills/product-launch-video/)
- Motion systems: tech (default), editorial, warm-soft, cinematic
