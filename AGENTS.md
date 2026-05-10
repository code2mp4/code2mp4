# AGENTS.md — How to produce a video with Code2MP4

You are working inside a Code2MP4 project. Your job is to help users generate **editable motion source files** and **deterministic video output**.

## What you are building

You are NOT generating a black-box MP4. You are producing:

```
storyboard.json → motion source (HTML/CSS/GSAP) → deterministic MP4
```

Every video you create has a structured storyboard, editable source files, and repeatable output. The user (or another agent) can inspect, edit, and re-render any video.

## Core principles

1. **Storyboard first, always.** Never write motion source until the storyboard is agreed.
2. **Motion source is editable.** Write readable HTML, CSS, and GSAP — not minified blobs.
3. **Deterministic output.** No `Math.random()`, no `Date.now()`, no `repeat: -1` in GSAP timelines.
4. **Check before render.** Run `hyperframes lint` and `hyperframes inspect` before calling render.
5. **Keep text readable.** No forced `<br>` in body text. Use natural wrapping with `max-width`.

## Workflow

### Step 1: Discovery

If the user hasn't specified these, ask:
- **Video type** — product-launch, social-short, tutorial, brand-intro, caption-reel, audio-reactive
- **Duration** — in seconds
- **Aspect ratio** — 16:9 (landscape), 9:16 (portrait), 1:1 (square)
- **Energy level** — calm, medium, high, dramatic
- **Audio needs** — voiceover, background music, SFX

### Step 2: Storyboard

Create `storyboard.json` in the project directory:

```json
{
  "title": "string",
  "duration": 30,
  "aspectRatio": "16:9",
  "scenes": [...]
}
```

Rules:
- Scene durations must sum to total duration
- Every scene must have an `id`
- Scene count: 3-5 for short videos, 5-8 for longer ones

**In interactive sessions**: present the storyboard to the user for approval before proceeding.

**In automated / CI workflows**: proceed if the storyboard passes validation (duration sum matches, scene ids unique, first scene is a hook, last scene is a CTA).

### Step 3: Motion source generation

For each scene, produce an HTML/CSS/GSAP fragment that:

1. Uses the active motion system's palette, fonts, and easing
2. Follows the video skill's scene templates and animation rules
3. Respects the HyperFrames contract (see below)

Write each scene fragment to the project directory.

### Step 4: Quality checks

Before rendering:

```bash
npx hyperframes lint --json                  # structural validation
npx hyperframes inspect --json               # visual audit (overflow, clipping)
```

Fix all errors. Warnings should be addressed unless intentionally suppressed with `data-layout-allow-overflow`.

### Step 5: Render

```bash
node "$OD_BIN" media generate \
  --surface video \
  --model hyperframes-html \
  --composition-dir <dir> \
  --output output.mp4
```

The server will:
1. Validate the composition directory
2. Spawn `npx hyperframes render --format mp4 --fps 30`
3. Stream progress back via SSE
4. Return the MP4 path on completion

### Step 6: Report

Output the final paths:
- Storyboard: `storyboard.json`
- Motion source: the composition directory
- Rendered MP4: `output.mp4`

## HyperFrames contract (non-negotiable)

These rules are load-bearing. Violating any of them produces broken video:

1. **`class="clip"` REQUIRED** on every element with `data-start` + `data-duration`
2. **`data-composition-id` ONLY on `#stage` div**, NOT on `<html>`
3. **NO track-index overlap** — clips on same track must not overlap in time
4. **NEVER `width=device-width`** in viewport meta — use fixed dimensions: `<meta name="viewport" content="width=1920,height=1080">`
5. **`html,body { width:1920px; height:1080px; overflow:hidden }`** — match data-width/data-height
6. **`window.__timelines["comp-id"] = gsap.timeline({ paused: true })`** — mandatory pattern
7. **No `Math.random()`, `Date.now()`, `repeat:-1`** — must be deterministic
8. **Animate visual properties only** — `opacity`, `x`, `y`, `scale`, `rotation`. Not `visibility`/`display`
9. **Font sizes ≥ 20px body, ≥ 60px headlines**
10. **Palette must match active MOTION.md tokens**
11. **NEVER `gsap.set()` on elements not in DOM at page load** — use `tl.set()` at the clip's `data-start`
12. **NEVER `<br>` in body text** — use `max-width` and natural wrapping
13. **Scene transitions mandatory for multi-scene compositions** — crossfade, directional wipe, or shader
14. **The transition IS the exit** — never animate elements out before transition fires

## Project directory conventions

```
projects/<project-id>/
  storybook.json          # approved storyboard
  .hf-cache/              # agent writes composition HTML here
    <timestamp>/
      index.html          # full HyperFrames composition
      scene-1.html        # scene fragments (optional)
      scene-2.html
  output.mp4              # rendered video
```

## Available resources

The project ships with reference files on disk. Use your Read tool to access them:

- `motion-systems/<name>/MOTION.md` — 5 curated motion systems with palettes, fonts, easing
- `script-systems/<name>/SCRIPT.md` — 3 narrative structures with hook patterns
- `video-skills/<name>/SKILL.md` — 6 composable video skills with scene templates
- `templates/blank-landscape.html` — 1920×1080 scaffold
- `templates/blank-portrait.html` — 1080×1920 scaffold

## Never do

- Never generate a video by calling an external API and downloading an MP4
- Never skip the storyboard step
- Never skip quality checks before rendering
- Never write minified, unreadable motion source
- Never use browser defaults (`#333`, `#3b82f6`, Roboto) — always define a palette
- Never hardcode texts that should be parametrized — use `data-composition-variables`
