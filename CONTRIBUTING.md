# Contributing to Open Video

Thank you for your interest in contributing! Open Video is an open-source project that welcomes contributions of all kinds — code, docs, motion systems, video skills, templates, and bug reports.

## Getting started

```bash
git clone https://github.com/open-video/open-video.git
cd open-video
pnpm install
pnpm dev       # start the server
pnpm test      # run tests
```

## Development workflow

1. **Fork** the repository
2. **Create a branch** for your change (`feat/new-skill`, `fix/render-timeout`, etc.)
3. **Make your change** — follow the existing code style
4. **Run checks** before submitting:
   ```bash
   pnpm typecheck   # TypeScript check
   pnpm build       # Build all packages
   pnpm test        # Run 49 tests
   ```
5. **Submit a PR** with a clear description of what you changed and why

## What to contribute

### Motion design systems
Add a new `MOTION.md` under `motion-systems/`. Each system is a markdown file with 8 sections:
- Visual Atmosphere
- Color Palette
- Typography
- Easing Signatures
- Transition Matrix
- Typography Animation Rules
- Timing & Rhythm
- Layout Principles
- Do's and Don'ts
- Anti-Slop Checklist

See existing systems in `motion-systems/` for the exact format.

### Video skills
Add a new `SKILL.md` under `video-skills/`. Each skill is a markdown file with YAML frontmatter:

```yaml
---
name: my-skill-name
description: Short description
triggers:
  - "keyword"
  - "触发词"
od:
  mode: video
  surface: video
  scenario: marketing
---
```

See existing skills in `video-skills/` for the exact format.

### Agent adapters
Add support for new coding-agent CLIs in `apps/server/src/agents.ts`. Each agent needs:
- `binCandidates` — names/paths to find the CLI on PATH
- `streamFormat` — one of `claude-stream-json`, `copilot-stream-json`, or `plain`
- `buildArgs` — function that returns spawn args for the given prompt
- `models` — list of supported model IDs

### HyperFrames templates
Add new `.html` files under `templates/`. Templates should be valid HyperFrames compositions with:
- `data-composition-id`, `data-duration`, `data-resolution` on `<html>`
- A `#stage` div with `data-*` attributes
- GSAP CDN and `window.__timelines` registration
- A `{ paused: true }` timeline with entrance animations

### Bug fixes and improvements
- Check the issues tab for open bugs
- Improvements to error handling, performance, a11y are always welcome
- Test your changes: `pnpm test`

## Code conventions

- **TypeScript** throughout — no plain `.js` files except build output
- **ESM** (`"type": "module"`)
- **No framework state management** — plain React `useState`/`useCallback`
- **CSS custom properties** for theming — use the design tokens in `globals.css`
- **Component files** are one component per file, co-located with their styles
- **Tests** use Vitest with `describe`/`it`/`expect`

## Project structure

```
apps/server/src/    — Backend (Express + SQLite)
apps/web/src/       — Frontend (Next.js 16 + React 18)
packages/contracts/ — Shared types
motion-systems/     — MOTION.md design systems
video-skills/       — SKILL.md video skills
templates/          — HF blank templates
tools/dev/          — ov-dev CLI
```

## Questions?

Open an issue or start a discussion. We're happy to help.

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
