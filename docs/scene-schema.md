# Scene Schema (`scene.json`)

A scene is the **atomic unit** of video production in Code2MP4. It describes exactly what one screen of the video looks like, how it animates, and what the agent needs to generate.

While `storyboard.json` provides a high-level plan, `scene.json` provides the **agent-executable specification** for a single scene — enough detail that a Scene Agent can generate the HyperFrames HTML without ambiguity.

## Schema

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Code2MP4 Scene",
  "type": "object",
  "required": ["id", "duration", "layout", "elements", "motion", "in", "out"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique scene identifier"
    },
    "duration": {
      "type": "number",
      "description": "Scene duration in seconds"
    },
    "briefId": {
      "type": "string",
      "description": "References the brief this scene belongs to"
    },
    "scriptId": {
      "type": "string",
      "description": "References the script segment this scene visualizes"
    },
    "layout": { "$ref": "#/$defs/layout" },
    "elements": {
      "type": "array",
      "items": { "$ref": "#/$defs/element" }
    },
    "motion": { "$ref": "#/$defs/motion" },
    "in": { "$ref": "#/$defs/transition" },
    "out": { "$ref": "#/$defs/transition" },
    "audio": { "$ref": "#/$defs/audio" }
  },
  "$defs": {
    "layout": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "center-text", "split-horizontal", "split-vertical",
            "card-grid-2", "card-grid-3", "card-grid-4",
            "full-bleed-image", "terminal-window",
            "bullet-list", "comparison-table",
            "icon-row", "single-button"
          ],
          "description": "Layout archetype"
        },
        "background": {
          "type": "string",
          "description": "Background color or gradient"
        },
        "padding": {
          "type": "number",
          "description": "Content padding in px"
        },
        "gap": {
          "type": "number",
          "description": "Gap between elements in px"
        }
      }
    },
    "element": {
      "type": "object",
      "required": ["id", "type", "position", "style"],
      "properties": {
        "id": {
          "type": "string",
          "description": "CSS selector id for this element"
        },
        "type": {
          "type": "string",
          "enum": ["headline", "subhead", "body", "card", "button", "icon", "image", "counter", "code-block", "divider", "logo", "badge"],
          "description": "Element type"
        },
        "position": {
          "type": "object",
          "properties": {
            "x": { "type": "string", "enum": ["left", "center", "right"] },
            "y": { "type": "string", "enum": ["top", "center", "bottom"] },
            "order": { "type": "number", "description": "Z-order (0 = back, higher = front)" }
          }
        },
        "style": {
          "type": "object",
          "properties": {
            "fontSize": { "type": "number" },
            "fontWeight": { "type": "number" },
            "color": { "type": "string" },
            "maxWidth": { "type": "number" },
            "textAlign": { "type": "string", "enum": ["left", "center", "right"] }
          }
        },
        "content": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "icon": { "type": "string", "description": "Icon name or path" },
            "src": { "type": "string", "description": "Image/video source path" }
          }
        }
      }
    },
    "motion": {
      "type": "object",
      "properties": {
        "entrance": {
          "type": "object",
          "properties": {
            "element": { "type": "string", "description": "Element id to animate" },
            "from": { "type": "object", "description": "Starting CSS properties" },
            "to": { "type": "object", "description": "Ending CSS properties (usually current state)" },
            "duration": { "type": "number" },
            "delay": { "type": "number" },
            "ease": { "type": "string" }
          }
        },
        "emphasis": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": ["pulse", "glow", "bounce", "shake", "counter-roll", "underline-sweep", "typewriter", "highlight-reveal", "none"]
            },
            "target": { "type": "string", "description": "Element id to emphasize" },
            "startTime": { "type": "number", "description": "Seconds into scene" },
            "duration": { "type": "number" }
          }
        },
        "exit": {
          "type": "object",
          "properties": {
            "description": "Exit animation — only on FINAL scene. Transition handles exit for all others",
            "element": { "type": "string" },
            "to": { "type": "object" },
            "duration": { "type": "number" },
            "ease": { "type": "string" }
          }
        }
      }
    },
    "transition": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["crossfade", "wipe-left", "wipe-right", "wipe-up", "wipe-down", "zoom-through", "glitch-dissolve", "hard-cut", "blur-crossfade"] },
        "duration": { "type": "number" },
        "ease": { "type": "string" }
      }
    },
    "audio": {
      "type": "object",
      "properties": {
        "voiceover": { "type": "string", "description": "Voiceover line for this scene" },
        "sfx": { "type": "string", "description": "SFX cue (e.g., 'whoosh', 'hit', 'ping')" },
        "music": { "type": "string", "description": "Music track transition or volume change" }
      }
    }
  }
}
```

## Layout archetypes

### center-text
Full-screen centered text. Best for hooks, CTA, single-message screens.
```
┌──────────────────┐
│                  │
│                  │
│    HEADLINE      │
│    subhead       │
│                  │
│                  │
└──────────────────┘
```

### split-horizontal
Two columns side by side. Best for feature demos with visuals.
```
┌────────┬────────┐
│        │        │
│  TEXT  │ VISUAL │
│        │        │
└────────┴────────┘
```

### card-grid-N
N cards in a row. Best for feature showcases, stats, comparisons.
```
┌─────┐ ┌─────┐ ┌─────┐
│     │ │     │ │     │
│ CARD│ │ CARD│ │ CARD│
│     │ │     │ │     │
└─────┘ └─────┘ └─────┘
```

### terminal-window
Code/terminal display with window chrome. Best for developer tools, CLI demos.
```
┌──────────────────────┐
│ ● ● ●  Terminal      │
├──────────────────────┤
│ $ command            │
│ output line 1        │
│ output line 2        │
│                      │
└──────────────────────┘
```

### single-button
Centered CTA button with label. Best for closing scenes.
```
┌──────────────────┐
│                  │
│   ┌──────────┐   │
│   │  BUTTON  │   │
│   └──────────┘   │
│      url.com     │
│                  │
└──────────────────┘
```

## Example: Feature scene

```json
{
  "id": "feature-1",
  "duration": 5,
  "briefId": "widgetx-v2-launch",
  "scriptId": "feature-1",
  "layout": {
    "type": "split-horizontal",
    "background": "#161B22",
    "padding": 120,
    "gap": 80
  },
  "elements": [
    {
      "id": "feature-icon",
      "type": "icon",
      "position": { "x": "left", "y": "center", "order": 0 },
      "style": { "fontSize": 64 },
      "content": { "icon": "terminal-check" }
    },
    {
      "id": "feature-headline",
      "type": "headline",
      "position": { "x": "left", "y": "center", "order": 1 },
      "style": { "fontSize": 72, "fontWeight": 700, "color": "#58A6FF", "maxWidth": 600 },
      "content": { "text": "One-click deploy" }
    },
    {
      "id": "feature-body",
      "type": "body",
      "position": { "x": "left", "y": "center", "order": 2 },
      "style": { "fontSize": 24, "color": "#8B949E", "maxWidth": 600, "textAlign": "left" },
      "content": { "text": "Connect your repo, pick a branch, hit deploy. That's it." }
    },
    {
      "id": "feature-visual",
      "type": "image",
      "position": { "x": "right", "y": "center", "order": 0 },
      "content": { "src": "assets/deploy-ui-screenshot.png" }
    }
  ],
  "motion": {
    "entrance": {
      "element": "feature-icon",
      "from": { "opacity": 0, "scale": 0.8, "x": -40 },
      "to": { "opacity": 1, "scale": 1, "x": 0 },
      "duration": 0.5,
      "delay": 0.2,
      "ease": "power3.out"
    },
    "emphasis": {
      "type": "pulse",
      "target": "feature-icon",
      "startTime": 2.0,
      "duration": 0.6
    }
  },
  "in": {
    "type": "crossfade",
    "duration": 0.5,
    "ease": "power2.inOut"
  },
  "audio": {
    "voiceover": "Connect any Git repository, choose your branch, and deploy with a single click. No SSH, no scripts, no YAML.",
    "sfx": "whoosh"
  }
}
```

## Scene grammar rules

Every scene must follow these rules:

1. **One message per scene** — never communicate two unrelated ideas in the same scene
2. **Text first, details second** — the headline must be readable in the first 0.3s
3. **Motion hierarchy** — entrance animation for primary element first, secondary elements after
4. **No exit animation** — the transition IS the exit (except final scene)
5. **Padding never below 80px** — text must breathe, especially on mobile
6. **Icon size proportional to text** — icons at 0.5-0.8× of headline font size
7. **Element count ≤ 5** — more than 5 visible elements per scene = cognitive overload
