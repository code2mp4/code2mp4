# Storyboard JSON Schema

A Code2MP4 storyboard is a structured JSON document that describes a video's scenes before any motion source is written. It is the contract between the Director Agent (which plans) and the Scene Agent (which executes).

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Storyboard",
  "type": "object",
  "required": ["title", "duration", "aspectRatio", "scenes"],
  "properties": {
    "title": {
      "type": "string",
      "description": "Human-readable title of the video"
    },
    "duration": {
      "type": "number",
      "description": "Total duration in seconds"
    },
    "aspectRatio": {
      "type": "string",
      "enum": ["16:9", "9:16", "1:1", "4:5"],
      "description": "Video aspect ratio"
    },
    "motionSystem": {
      "type": "string",
      "enum": ["editorial", "tech", "warm-soft", "cinematic", "brutalist"],
      "description": "Motion design system to apply"
    },
    "scenes": {
      "type": "array",
      "minItems": 1,
      "maxItems": 12,
      "items": { "$ref": "#/$defs/scene" }
    }
  },
  "$defs": {
    "scene": {
      "type": "object",
      "required": ["id", "duration", "goal", "visual", "text", "motion"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique scene identifier (e.g., 'hook', 'feature-1', 'cta')"
        },
        "duration": {
          "type": "number",
          "minimum": 2,
          "maximum": 30,
          "description": "Scene duration in seconds"
        },
        "goal": {
          "type": "string",
          "description": "What this scene should communicate to the viewer"
        },
        "visual": {
          "type": "string",
          "description": "Visual description: background, layout, key elements, color emphasis"
        },
        "text": {
          "type": "string",
          "description": "On-screen text: headline, subtitle, body copy"
        },
        "motion": {
          "type": "string",
          "description": "Animation description: entrance, emphasis, exit patterns"
        },
        "audio": {
          "type": "string",
          "description": "Audio cue: voiceover line, SFX, music change (optional)"
        }
      }
    }
  }
}
```

## Constraints

1. **Sum of scene durations must equal total duration** (within ±0.5s tolerance)
2. **Every scene id must be unique** within a storyboard
3. **Scene count**: 1-3 for shorts (< 15s), 3-5 for medium (15-60s), 5-8 for long (> 60s)
4. **First scene should hook** — communicate the core premise within 3 seconds
5. **Last scene should CTA** — tell the viewer what to do next

## Minimal valid storyboard

```json
{
  "title": "My First Video",
  "duration": 15,
  "aspectRatio": "16:9",
  "motionSystem": "tech",
  "scenes": [
    {
      "id": "hook",
      "duration": 3,
      "goal": "Grab attention with the core premise",
      "visual": "Dark background, headline center-screen, accent glow",
      "text": "Building software is hard.",
      "motion": "Headline fades in with typewriter effect"
    },
    {
      "id": "solution",
      "duration": 8,
      "goal": "Present the solution and key features",
      "visual": "Split layout: left feature list, right product visual",
      "text": "Our tool makes it easy.\n\nFeature 1: Automated testing\nFeature 2: One-click deploy\nFeature 3: Real-time monitoring",
      "motion": "Feature items slide in sequentially, product visual scales up"
    },
    {
      "id": "cta",
      "duration": 4,
      "goal": "Drive action",
      "visual": "Centered CTA button on brand color, URL below",
      "text": "Get started free →\n\ntoolname.com",
      "motion": "Button pulses with gentle scale, URL fades in"
    }
  ]
}
```

## Scene archetypes

### Hook scene (openers)

- **Duration**: 2-4s
- **Goal**: Communicate the core premise immediately
- **Visual**: Minimal — one headline, one accent color, full-bleed background
- **Motion**: Fast entrance (0.3-0.5s), no exit animation

### Feature scene (body)

- **Duration**: 5-10s
- **Goal**: Demonstrate value with specific details
- **Visual**: Structured layout — bullet points, split panels, or data viz
- **Motion**: Sequential reveals, emphasis highlights

### CTA scene (closers)

- **Duration**: 3-5s
- **Goal**: Drive specific action
- **Visual**: Centered button/URL, high-contrast colors
- **Motion**: Emphasis animation (pulse, scale bounce), no exit

### Transition scene (bridges)

- **Duration**: 0.5-1s
- **Goal**: Smoothly connect adjacent scenes
- **Visual**: Abstract — color wipe, blur, gradient shift
- **Motion**: Crossfade, directional wipe, or shader

## Validation

A storyboard MUST pass these checks:

- [ ] `title` is present and non-empty
- [ ] `duration` is a positive number
- [ ] `aspectRatio` is one of: "16:9", "9:16", "1:1", "4:5"
- [ ] `scenes` array has at least 1 element
- [ ] Every scene has `id`, `duration`, `goal`, `visual`, `text`, `motion`
- [ ] Scene `id`s are unique
- [ ] `sum(scene.duration) ≈ totalDuration` (±0.5s)
- [ ] First scene duration ≤ 5s (hook)
- [ ] Last scene is a CTA (duration ≤ 8s)
