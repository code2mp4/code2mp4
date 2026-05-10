# @code2mp4/contracts

**The production contract layer for Code2MP4.**

This package defines the TypeScript types that implement Code2MP4's video production schemas. Every intermediate artifact in the agent video pipeline has a corresponding type here — from the video brief upstream to the campaign package downstream.

## Why this exists

Code2MP4 is not a black-box video generator. It defines a structured pipeline:

```
brief.json → script.json → storyboard.json → scene.json
           → render.config.json → quality-report.json
           → campaign package
```

Each arrow is a **production contract** — a structured data format that agents and tools can read, write, and validate. This package is the TypeScript implementation of those contracts.

## Types

### Upstream (input layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `VideoBrief` | `brief.json` | WHY — goal, audience, format, constraints, distribution |
| `VideoScript` | `script.json` | WHAT — hook, narrative arc, segments, pacing, CTA, voiceover |

### Core (production layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `Storyboard` | `storyboard.json` | HOW — scene plan with visual, text, motion specs |
| `StoryboardScene` | — | Per-scene specification (id, goal, visual, text, motion, audio) |
| `SceneSpec` | `scene.json` | DETAIL — agent-executable scene with layout, elements, motion grammar |
| `SceneElement` | — | Individual visual element (headline, card, button, icon, etc.) |
| `SceneMotion` | — | Entrance, emphasis, and exit animation specs |

### Quality (review layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `QualityReport` | `quality-report.json` | Pass/fail with 7 dimensions, errors, warnings, scores |
| `QualityDimension` | — | Single review dimension (hook, script, readability, etc.) |
| `QualityCheck` | — | Individual check within a dimension |
| `QualityFinding` | — | Error or warning with severity and fix suggestion |

### Render (execution layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `RenderConfig` | `render.config.json` | Quality, FPS, resolution, codec, variables, variants |

### Distribution (campaign layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `CampaignManifest` | `campaign/package.json` | Multi-platform package with variants, covers, copy |
| `CampaignVariant` | — | Single platform-specific video variant |
| `CampaignCover` | — | Cover/thumbnail specification |
| `CampaignCopy` | — | Social media copy specification |

### Template (authoring layer)

| Type | Artifact | What it defines |
|------|----------|----------------|
| `TemplateManifest` | `templates/*/template.json` | Template metadata, storyboard constraints, discovery questions |
| `TemplateQuestion` | — | Single discovery question for the interactive form |

## Design principles

1. **Pure TypeScript** — no runtime dependencies, no Node.js imports, no browser APIs
2. **Schema-driven** — every type maps to a JSON Schema file in `schemas/`
3. **Agent-readable** — types are documented with `@description` JSDoc for agent consumption
4. **Backward compatible** — legacy types preserved alongside new production types
5. **Single source of truth** — docs/schemas, TypeScript types, and JSON Schema files stay in sync

## Usage

```typescript
import type { VideoBrief, VideoScript, Storyboard, QualityReport } from '@code2mp4/contracts';

const brief: VideoBrief = {
  id: 'widgetx-v2-launch',
  goal: { primary: 'Sign up for trial', secondary: 'WidgetX is fastest' },
  audience: { who: 'Developers', context: 'GitHub', awareness: 'problem-aware' },
  format: { primary: '16:9', duration: 30 }
};

// Validate with the JSON Schema (coming in v0.5)
import briefSchema from '@code2mp4/contracts/schemas/brief.schema.json';
```

## JSON Schemas

Corresponding JSON Schema files live in `schemas/` and enforce the same contracts for validation:

- `schemas/brief.schema.json`
- `schemas/script.schema.json`
- `schemas/storyboard.schema.json`
- `schemas/scene.schema.json`
- `schemas/render-config.schema.json`
- `schemas/quality-report.schema.json`
- `schemas/campaign.schema.json`
- `schemas/template.schema.json`
