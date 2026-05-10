# OSS Intro Template

Turn a GitHub README into a 30-second project introduction video. What → Why → How → Get Started.

## Quick start

```bash
code2mp4 create --template oss-intro --name "my-project-intro"
```

## What you provide

- Project name
- One-line description
- Problem it solves
- 3 key concepts
- Install/quickstart command

## What you get

- `brief.json` — pre-filled brief for an OSS intro video
- `script.json` — narrative script (what → why → how → get started)
- `storyboard.json` — scene plan with editorial motion system tokens
- `scene-template.html` — warm serif typography template
- `quality-checklist.md` — review gates

## Scene structure

| Scene | Duration | Type | Default content |
|---|---|---|---|
| 1. What | 7s | hook | "{{project-name}}\n\n{{one-liner}}" |
| 2. Why | 7s | context | "{{problem-solved}}" |
| 3. How | 10s | detail | "Key concepts: {{key-concepts}}" |
| 4. Get Started | 6s | cta | "{{install-command}}" |

## Related
- Example: [examples/oss-intro/](../../examples/oss-intro/)
- Skill: [video-skills/motion-brand-intro/](../../video-skills/motion-brand-intro/)
- Motion systems: editorial (default), tech, warm-soft
