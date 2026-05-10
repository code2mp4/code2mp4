# Agent Workflow: How to use Code2MP4

This document is written for coding agents (Claude Code, OpenCode, Codex, Gemini CLI, etc.) that need to generate video with Code2MP4.

## Quick reference

```bash
# Check server status
curl http://localhost:7456/api/health

# Create a project
curl -X POST http://localhost:7456/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-video", "videoType": "product-launch", "duration": 30, "orientation": "16:9", "energy": "medium"}'

# Generate video (agent calls this):
node "$OD_BIN" media generate \
  --project-id <id> \
  --surface video \
  --model hyperframes-html \
  --composition-dir .hf-cache/<timestamp> \
  --output output.mp4 \
  --fps 30 \
  --quality standard
```

## Full walkthrough

### 1. Set up the environment

The Code2MP4 server must be running:

```bash
cd /path/to/code2mp4
pnpm dev   # starts server on port 7456, opens frontend
```

Verify:

```bash
curl http://localhost:7456/api/health
# → { "status": "ok", "system": { "node": true, "ffmpeg": true, "hyperframes": true }, "agents": [...] }
```

### 2. Create a project

```bash
curl -s -X POST http://localhost:7456/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Launch — WidgetX v2",
    "videoType": "product-launch",
    "duration": 30,
    "orientation": "16:9",
    "energy": "high",
    "audioNeeds": ["voiceover", "background-music"],
    "motionSystemId": "tech"
  }'
# → { "id": "proj_abc123", ... }
```

Save the project ID.

### 3. Read the motion system

If a motion system was selected, read its file:

```bash
cat motion-systems/tech/MOTION.md
```

Extract the tokens:
- Canvas color (background)
- Accent colors (primary + secondary)
- Display font + body font
- Entrance easing + exit easing
- Transition preference

### 4. Create the storyboard

Write `projects/<project-id>/storyboard.json`. Follow the [storyboard schema](storyboard-schema.md).

Example structure:
```json
{
  "title": "WidgetX v2 Launch",
  "duration": 30,
  "aspectRatio": "16:9",
  "motionSystem": "tech",
  "scenes": [
    { "id": "problem", "duration": 5, "goal": "...", "visual": "...", "text": "...", "motion": "..." },
    { "id": "promise", "duration": 4, "goal": "...", "visual": "...", "text": "...", "motion": "..." },
    { "id": "feature-1", "duration": 6, "goal": "...", "visual": "...", "text": "...", "motion": "..." },
    { "id": "feature-2", "duration": 6, "goal": "...", "visual": "...", "text": "...", "motion": "..." },
    { "id": "feature-3", "duration": 5, "goal": "...", "visual": "...", "text": "...", "motion": "..." },
    { "id": "cta", "duration": 4, "goal": "...", "visual": "...", "text": "...", "motion": "..." }
  ]
}
```

### 5. Generate motion source

For each scene, write a HyperFrames HTML fragment. Use the blank template as a starting point:

```bash
cp templates/blank-landscape.html projects/<project-id>/.hf-cache/v1/index.html
```

Replace the placeholder content with actual scene content, following the motion system's palette and easing.

Tips:
- Combine all scenes into one `index.html` with scene transitions
- Each scene gets a `<div class="scene" data-scene="N">` container
- Use GSAP timeline with `paused: true` and `window.__timelines` registration
- Scene transitions use crossfade (opacity animation on `.scene` elements)

### 6. Run quality checks

```bash
npx hyperframes lint --json
# → { "passed": true, "warnings": [] }

npx hyperframes inspect --json
# → { "passed": true, "findings": [] }
```

Fix all errors. Warnings should be addressed.

### 7. Render to MP4

```bash
node "$OD_BIN" media generate \
  --project-id proj_abc123 \
  --surface video \
  --model hyperframes-html \
  --composition-dir .hf-cache/v1 \
  --output output.mp4 \
  --fps 30 \
  --quality standard
```

The server spawns HyperFrames render, streams progress via SSE. On completion:

```json
{ "type": "complete", "outputPath": "output.mp4", "fileSize": 2480000 }
```

### 8. Generate audio (optional)

```bash
# TTS voiceover
node "$OD_BIN" media generate \
  --project-id proj_abc123 \
  --surface audio \
  --prompt "Welcome to WidgetX v2. The fastest way to build dashboards." \
  --output voiceover.wav

# SFX
node "$OD_BIN" media generate \
  --project-id proj_abc123 \
  --surface audio \
  --audio-kind sfx \
  --sfx-kind whoosh \
  --output whoosh.wav
```

### 9. Re-render with audio

Update `index.html` to reference the audio files, then re-render.

## Error recovery

If the render fails:

1. Check stderr output for HyperFrames errors
2. Run `npx hyperframes lint --json` to catch structural issues
3. Run `npx hyperframes validate --json` for runtime issues
4. Check that all asset paths in HTML are relative to the composition directory
5. Verify FFmpeg is installed: `ffmpeg -version`

If a scene was generated incorrectly:
- Edit the storyboard to fix the scene description
- Re-run just that scene
- Re-assemble and re-render
