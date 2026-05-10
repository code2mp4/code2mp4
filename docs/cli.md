# CLI Design

Code2MP4 has two CLIs serving different audiences:

| CLI | Audience | Purpose |
|---|---|---|
| `od` | Coding agents | Media generation, health checks (dispatches to REST API) |
| `code2mp4` | Developers | Project scaffolding, rendering, quality checks, campaign packaging |

This document defines the developer-facing `code2mp4` CLI.

## Architecture

```
code2mp4 <command> [options]
```

All commands operate on a project directory. The project root is resolved by walking up from the current working directory for a `code2mp4.config.json` or falling back to `./projects/<name>`.

## Commands

### `code2mp4 init`

Scaffold a new video project from a template.

```bash
code2mp4 init [name] [options]

Options:
  --template, -t    Template to use (product-launch, oss-intro, release-notes)
  --name, -n        Project name (defaults to template name)
  --dir, -d         Target directory (defaults to ./projects/<name>)
  --non-interactive  Skip discovery questions, use template defaults
```

**What it does:**
1. Creates the project directory with `code2mp4.config.json`
2. Copies the selected template's files
3. Generates `brief.json` from discovery questions (or template defaults)
4. Outputs the project path and next steps

**Example:**
```bash
code2mp4 init --template product-launch --name "widgetx-v2"
# → Created project at projects/widgetx-v2/
# → Next: code2mp4 storyboard projects/widgetx-v2
```

### `code2mp4 create`

Alias for `code2mp4 init` — create a new project.

### `code2mp4 storyboard`

Generate a storyboard from a brief.

```bash
code2mp4 storyboard <project-dir> [options]

Options:
  --brief           Brief file path (default: <project-dir>/brief.json)
  --motion, -m      Motion system override
  --output, -o      Output path (default: <project-dir>/storyboard.json)
```

**What it does:**
1. Reads `brief.json` and `script.json` (if present)
2. Composes the Director Agent prompt
3. Runs the agent to generate a storyboard
4. Validates the storyboard against the brief
5. Writes `storyboard.json`

### `code2mp4 build`

Generate motion source from a storyboard.

```bash
code2mp4 build <project-dir> [options]

Options:
  --storyboard, -s  Storyboard file path
  --scene, -n       Build a specific scene only (by id or number)
  --retry, -r       Retry a failed scene
```

**What it does:**
1. Reads `storyboard.json`
2. Runs the Scene Agent for each scene (or specified scene)
3. Writes scene HTML fragments
4. Assembles into a complete HyperFrames composition
5. Writes the composition to `<project-dir>/.hf-cache/<timestamp>/index.html`

### `code2mp4 render`

Render the assembled composition to MP4.

```bash
code2mp4 render <project-dir> [options]

Options:
  --quality, -q     Render quality: draft, standard, high (default: standard)
  --fps, -f         Frames per second (default: 30)
  --resolution, -r  Output resolution: hd, fhd, 4k (default: fhd)
  --format          Output format: mp4, webm (default: mp4)
  --output, -o      Output file path (default: <project-dir>/output.mp4)
  --variables       Composition variable overrides (JSON string)
```

**What it does:**
1. Detects the latest composition directory in `.hf-cache/`
2. Runs quality pre-checks (lint, inspect)
3. Spawns `npx hyperframes render` with the specified options
4. Streams render progress to stdout
5. Writes the MP4 file

### `code2mp4 check`

Run quality checks against a project.

```bash
code2mp4 check <project-dir> [options]

Options:
  --output, -o      Output path (default: <project-dir>/quality-report.json)
  --strict          Treat warnings as errors
```

**What it does:**
1. Reads all project artifacts (brief, script, storyboard, composition)
2. Runs the Video Review Theater across 7 dimensions:
   - Hook strength
   - Script quality (anti-AI phrase detection)
   - Readability (text density, font sizes, safe zones)
   - Motion quality (animation variety, determinism)
   - Platform suitability (aspect ratio, duration, silent-safe)
   - Brand consistency (palette, fonts, logo)
   - Render determinism (lint, inspect)
3. Writes `quality-report.json`
4. Exits 0 on pass, 1 on failure (errors) or 2 on warnings

**Example CI integration:**
```yaml
- name: Quality check
  run: code2mp4 check ./projects/release-video --strict
```

### `code2mp4 variants`

Generate platform variants from one motion source.

```bash
code2mp4 variants <project-dir> [options]

Options:
  --all             Generate all platform variants
  --aspect          Specific aspect ratio: 16:9, 9:16, 1:1, 4:5
  --duration        Specific duration variant in seconds
  --audio-mode      Audio mode: full, music-only, silent, captioned
```

**What it does:**
1. Reads the project brief for format variants
2. Generates `render.config.json` for each variant
3. Renders each variant (or re-uses existing renders)
4. Writes variant MP4s to `<project-dir>/variants/`

### `code2mp4 package`

Build a complete campaign package from rendered variants.

```bash
code2mp4 package <project-dir> [options]

Options:
  --output, -o      Output directory (default: <project-dir>/campaign/)
```

**What it does:**
1. Collects all rendered MP4 variants
2. Generates cover images per platform
3. Generates social media copy per platform
4. Generates SRT captions (if voiceover exists)
5. Writes `campaign/package.json` (campaign manifest)
6. Outputs the package directory structure

**Output structure:**
```
campaign/
  videos/
    output-16x9-30s.mp4
    output-9x16-15s.mp4
    output-1x1-15s.mp4
  covers/
    youtube-thumb.jpg
    instagram-cover.jpg
    github-preview.gif
  captions/
    landscape-30s.srt
    portrait-15s.srt
  copy/
    tweet.md
    linkedin-post.md
    release-notes.md
  package.json
```

## Global options

```bash
code2mp4 [command] [options]

Global:
  --help, -h        Show help
  --version, -v     Show version
  --quiet, -q       Suppress output except errors
  --json            Output as JSON (for CI/agent consumption)
  --project, -p     Project directory (override auto-detection)
```

## Configuration

Project configuration is stored in `code2mp4.config.json` at the project root:

```json
{
  "version": 1,
  "engine": "hyperframes",
  "defaults": {
    "quality": "standard",
    "fps": 30,
    "resolution": "fhd",
    "format": "mp4"
  }
}
```

## Implementation status

| Command | Status |
|---|---|
| `code2mp4 init` | Template system ready, CLI entry point pending |
| `code2mp4 build` | Multi-stage pipeline implemented, CLI wiring pending |
| `code2mp4 render` | Bridge functions ready, CLI wiring pending |
| `code2mp4 check` | Quality report schema defined, reviewer skill created, implementation pending |
| `code2mp4 variants` | Schema defined, implementation pending |
| `code2mp4 package` | Campaign manifest schema defined, implementation pending |

The `od` CLI dispatcher already handles agent-facing `media generate` / `media wait` / `health` commands and is fully operational.
