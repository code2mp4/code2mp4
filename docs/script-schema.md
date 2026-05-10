# Script Schema (`script.json`)

The script translates the **brief's intent** into a **narrative structure**. It defines what the video says, in what order, with what rhythm. It sits between the brief (WHY) and the storyboard (HOW).

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Video Script",
  "type": "object",
  "required": ["briefId", "narrativeArc", "segments"],
  "properties": {
    "briefId": {
      "type": "string",
      "description": "References the brief this script implements"
    },
    "hook": {
      "type": "object",
      "required": ["line", "type", "duration"],
      "properties": {
        "line": {
          "type": "string",
          "description": "The hook line — must grab attention in under 3 seconds"
        },
        "type": {
          "type": "string",
          "enum": ["question", "statement", "stat", "contrast", "pattern-interrupt"],
          "description": "Hook pattern"
        },
        "duration": {
          "type": "number",
          "description": "Hook duration in seconds (recommended: 2-4s)"
        }
      }
    },
    "narrativeArc": {
      "type": "string",
      "enum": [
        "problem-solution-cta",
        "what-why-how-get-started",
        "hook-context-features-proof-cta",
        "teaser-reveal-details-cta",
        "before-after-cta"
      ],
      "description": "Narrative structure"
    },
    "segments": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/segment" }
    },
    "pacing": { "$ref": "#/$defs/pacing" },
    "cta": { "$ref": "#/$defs/cta" },
    "voiceover": {
      "type": "object",
      "properties": {
        "fullText": { "type": "string", "description": "Complete voiceover script" },
        "wordCount": { "type": "number" },
        "estimatedDuration": { "type": "number", "description": "Estimated speaking duration at 150 wpm" },
        "voiceModel": { "type": "string" }
      }
    },
    "closedCaptions": {
      "type": "boolean",
      "description": "Whether captions are required (true if the video must work without audio)"
    }
  },
  "$defs": {
    "segment": {
      "type": "object",
      "required": ["id", "type", "duration", "text"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Segment identifier"
        },
        "type": {
          "type": "string",
          "enum": ["hook", "context", "problem", "promise", "feature", "proof", "detail", "cta", "outro"],
          "description": "Segment type in the narrative arc"
        },
        "duration": {
          "type": "number",
          "description": "Segment duration in seconds"
        },
        "text": {
          "type": "string",
          "description": "On-screen text for this segment"
        },
        "voiceover": {
          "type": "string",
          "description": "Voiceover line for this segment (optional)"
        },
        "transition": {
          "type": "string",
          "enum": ["crossfade", "wipe", "hard-cut", "shader"],
          "description": "Transition into this segment"
        },
        "emphasis": {
          "type": "string",
          "enum": ["none", "bold-word", "highlight-phrase", "counter", "stat-callout"],
          "description": "Text emphasis technique"
        }
      }
    },
    "pacing": {
      "type": "object",
      "properties": {
        "pattern": {
          "type": "string",
          "enum": ["fast-fast-slow", "slow-build", "steady", "peak-valley", "accelerating"],
          "description": "Pacing pattern"
        },
        "beatsPerSegment": {
          "type": "number",
          "description": "Information beats per segment (2-3 for fast, 1 for slow)"
        },
        "pauses": {
          "type": "array",
          "items": { "type": "object", "properties": { "after": { "type": "string" }, "duration": { "type": "number" } } },
          "description": "Intentional pauses for emphasis"
        }
      }
    },
    "cta": {
      "type": "object",
      "required": ["text", "style"],
      "properties": {
        "text": {
          "type": "string",
          "description": "Call to action text"
        },
        "style": {
          "type": "string",
          "enum": ["direct", "soft", "curiosity", "urgency", "social-proof"],
          "description": "CTA style"
        },
        "visual": {
          "type": "string",
          "description": "CTA visual treatment (e.g., 'button with glow', 'URL overlay')"
        },
        "duration": {
          "type": "number",
          "description": "CTA segment duration (recommended: 3-6s)"
        }
      }
    }
  }
}
```

## Example: Product Launch Script

```json
{
  "briefId": "widgetx-v2-launch",
  "hook": {
    "line": "Deploying your code should not take an afternoon.",
    "type": "statement",
    "duration": 3
  },
  "narrativeArc": "problem-solution-cta",
  "segments": [
    {
      "id": "hook",
      "type": "hook",
      "duration": 3,
      "text": "Deploying should not take an afternoon.",
      "transition": "crossfade",
      "emphasis": "none"
    },
    {
      "id": "problem",
      "type": "problem",
      "duration": 4,
      "text": "Manual deploys. SSH tunnels. Broken scripts.\n\nYou didn't become a developer to do ops.",
      "transition": "crossfade",
      "emphasis": "highlight-phrase"
    },
    {
      "id": "promise",
      "type": "promise",
      "duration": 4,
      "text": "WidgetX ships your code in 60 seconds.",
      "transition": "wipe",
      "emphasis": "stat-callout"
    },
    {
      "id": "feature-1",
      "type": "feature",
      "duration": 5,
      "text": "One-click deploy.\nConnect your repo, pick a branch, hit deploy.",
      "voiceover": "Connect any Git repository, choose your branch, and deploy with a single click. No SSH, no scripts, no YAML.",
      "transition": "crossfade",
      "emphasis": "bold-word"
    },
    {
      "id": "feature-2",
      "type": "feature",
      "duration": 5,
      "text": "Instant rollback.\nSomething went wrong? One click to undo.",
      "voiceover": "Every deploy is atomic. If something breaks, rollback instantly — no downtime, no panic.",
      "transition": "crossfade",
      "emphasis": "bold-word"
    },
    {
      "id": "feature-3",
      "type": "feature",
      "duration": 5,
      "text": "Preview environments.\nSee changes before they ship.",
      "voiceover": "Every pull request gets its own preview URL. Review changes live before merging.",
      "transition": "crossfade",
      "emphasis": "bold-word"
    },
    {
      "id": "cta",
      "type": "cta",
      "duration": 4,
      "text": "Start deploying in 60 seconds.\n\nwidgetx.io — free trial, no credit card.",
      "voiceover": "Start deploying in 60 seconds. Visit widgetx.io for a free trial — no credit card required.",
      "transition": "crossfade",
      "emphasis": "stat-callout"
    }
  ],
  "pacing": {
    "pattern": "fast-fast-slow",
    "beatsPerSegment": 2
  },
  "cta": {
    "text": "Start deploying in 60 seconds. widgetx.io",
    "style": "direct",
    "visual": "button with glow, URL below",
    "duration": 4
  },
  "voiceover": {
    "fullText": "Deploying should not take an afternoon. Manual deploys. SSH tunnels. Broken scripts. You didn't become a developer to do ops. WidgetX ships your code in 60 seconds. One-click deploy. Connect your repo, pick a branch, hit deploy. Instant rollback. Preview environments. Start deploying in 60 seconds. Visit widgetx.io for a free trial.",
    "wordCount": 78,
    "estimatedDuration": 31,
    "voiceModel": "elevenlabs-adam"
  },
  "closedCaptions": true
}
```

## Script quality rules

A valid script must pass these checks:

- [ ] Hook line is under 15 words (reads in ~3s)
- [ ] Hook type matches audience awareness level (question for unaware, stat for solution-aware)
- [ ] Segment durations sum to total duration (±1s)
- [ ] CTA segment is the last segment
- [ ] No segment exceeds 8 seconds without a visual change
- [ ] Voiceover word count × 0.4 ≈ total duration (150 wpm pace)
- [ ] Each segment's on-screen text is under 60 characters (readable at glance)
- [ ] No more than 3 consecutive segments without emphasis/transition variation
- [ ] No segment uses the same transition type as the previous one (unless intentional)

## Relationship to storyboard

The script defines **what** is communicated. The storyboard defines **how** it looks. Each script segment maps to one storyboard scene:

```
script.segments[i]  →  storyboard.scenes[i]
  segment.type       →  scene.goal (derived from type)
  segment.text       →  scene.text
  segment.duration   →  scene.duration
  segment.emphasis   →  scene.motion
  segment.voiceover  →  scene.audio
```
