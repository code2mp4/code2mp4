# Video Brief Schema (`brief.json`)

The brief is the **upstream input** to the Code2MP4 pipeline — it captures **why** the video exists, who it's for, and what success looks like. It feeds into script generation, storyboard planning, and quality review.

A brief is not a creative document. It's a structured specification that an agent can read, validate, and execute against.

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Video Brief",
  "type": "object",
  "required": ["id", "goal", "audience", "format"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique brief identifier (e.g., 'widgetx-v2-launch')"
    },
    "goal": {
      "type": "object",
      "required": ["primary", "secondary"],
      "properties": {
        "primary": {
          "type": "string",
          "description": "The ONE thing the viewer should do after watching (e.g., 'sign up for free trial')"
        },
        "secondary": {
          "type": "string",
          "description": "What the viewer should remember if they don't take action (e.g., 'WidgetX is the fastest deployment tool')"
        }
      }
    },
    "audience": {
      "type": "object",
      "required": ["who", "context"],
      "properties": {
        "who": {
          "type": "string",
          "description": "Target audience in one sentence (e.g., 'Solo developers tired of manual deployment')"
        },
        "context": {
          "type": "string",
          "description": "Where and when they'll watch (e.g., 'Browsing GitHub, looking for deployment tools')"
        },
        "pain": {
          "type": "string",
          "description": "The specific pain point this video addresses"
        },
        "awareness": {
          "type": "string",
          "enum": ["unaware", "problem-aware", "solution-aware", "product-aware"],
          "description": "Audience awareness level"
        }
      }
    },
    "format": {
      "type": "object",
      "required": ["primary", "duration"],
      "properties": {
        "primary": {
          "type": "string",
          "enum": ["16:9", "9:16", "1:1", "4:5"],
          "description": "Primary aspect ratio"
        },
        "variants": {
          "type": "array",
          "items": { "type": "string", "enum": ["16:9", "9:16", "1:1", "4:5"] },
          "description": "Additional aspect ratios needed"
        },
        "duration": {
          "type": "number",
          "description": "Duration in seconds"
        },
        "durationVariants": {
          "type": "array",
          "items": { "type": "number" },
          "description": "Variant durations (e.g., [15, 30, 60] for short/medium/long)"
        }
      }
    },
    "tone": {
      "type": "string",
      "enum": ["professional", "friendly", "technical", "dramatic", "minimal", "playful"],
      "description": "Overall tone of the video"
    },
    "energy": {
      "type": "string",
      "enum": ["calm", "medium", "high", "dramatic"],
      "description": "Energy level"
    },
    "motionSystem": {
      "type": "string",
      "enum": ["editorial", "tech", "warm-soft", "cinematic", "brutalist"],
      "description": "Motion design system"
    },
    "branding": {
      "type": "object",
      "properties": {
        "logo": { "type": "string", "description": "Path or URL to logo asset" },
        "colors": {
          "type": "object",
          "properties": {
            "primary": { "type": "string", "description": "Primary brand color (hex)" },
            "secondary": { "type": "string", "description": "Secondary brand color (hex)" }
          }
        },
        "font": { "type": "string", "description": "Brand font family" }
      }
    },
    "audio": {
      "type": "object",
      "properties": {
        "voiceover": { "type": "boolean" },
        "backgroundMusic": { "type": "boolean" },
        "sfx": { "type": "boolean" },
        "voiceModel": { "type": "string" },
        "musicTrack": { "type": "string" }
      }
    },
    "constraints": {
      "type": "object",
      "properties": {
        "noAudio": { "type": "boolean", "description": "Video must work without audio (silent playback)" },
        "safeZone": { "type": "number", "description": "Safe zone margin in px (default 80)" },
        "maxTextPerScreen": { "type": "number", "description": "Max characters per screen" },
        "includeCaptions": { "type": "boolean" },
        "deadline": { "type": "string", "description": "Production deadline (ISO 8601)" }
      }
    },
    "distribution": {
      "type": "object",
      "properties": {
        "platforms": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Target platforms (e.g., ['github', 'twitter', 'youtube', 'website'])"
        },
        "needsCover": { "type": "boolean", "description": "Generate cover/thumbnail" },
        "needsSocialCopy": { "type": "boolean", "description": "Generate social media copy" }
      }
    }
  }
}
```

## Example: Product Launch

```json
{
  "id": "widgetx-v2-launch",
  "goal": {
    "primary": "Sign up for WidgetX free trial",
    "secondary": "WidgetX makes deployment 10x faster than manual workflows"
  },
  "audience": {
    "who": "Solo developers and small teams tired of manual deployment",
    "context": "Browsing GitHub trending, looking for developer tools",
    "pain": "Deploying takes an afternoon instead of seconds",
    "awareness": "problem-aware"
  },
  "format": {
    "primary": "16:9",
    "variants": ["9:16", "1:1"],
    "duration": 30,
    "durationVariants": [15, 60]
  },
  "tone": "technical",
  "energy": "high",
  "motionSystem": "tech",
  "branding": {
    "colors": { "primary": "#58A6FF", "secondary": "#3FB950" }
  },
  "audio": {
    "voiceover": true,
    "backgroundMusic": true,
    "sfx": true
  },
  "constraints": {
    "safeZone": 80,
    "includeCaptions": true,
    "noAudio": true
  },
  "distribution": {
    "platforms": ["github", "twitter", "youtube", "website"],
    "needsCover": true,
    "needsSocialCopy": true
  }
}
```

## Relationship to downstream schemas

```
brief.json (WHY: goal, audience, constraints)
    ↓
script.json (WHAT: hook, narrative, CTA, timing)
    ↓
storyboard.json (HOW: scenes, visuals, text, motion)
    ↓
scene.json (DETAIL: per-scene exact spec for agent)
    ↓
render.config.json (EXECUTE: resolution, fps, quality, output)
```

The brief is the **source of truth for intent**. Every downstream artifact can be validated against it: "Does this scene serve the primary goal? Does this script address the audience's pain? Is the format correct?"
