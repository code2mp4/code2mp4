# Code2MP4 — AI-driven video production

Code2MP4 combines [Open Design][od]'s AI agent orchestration with [HyperFrames][hf]' HTML-first video rendering. The AI agent writes HyperFrames-compatible HTML compositions guided by video-specific prompt discovery, motion design systems, and composable video skills. The result is rendered to MP4 by HyperFrames.

🏗 **Production-grade**: 4 agents auto-detected, 5 motion systems, 6 video skills,
SSE streaming, agent run lifecycle management, HyperFrames render pipeline,
SQLite persistence, `od` CLI dispatcher, 49 tests, CI.

[od]: https://github.com/nexu-io/open-design
[hf]: https://github.com/heygen-com/hyperframes

## Architecture

```
Browser (Next.js 16 SPA)
    │  POST /api/runs    GET /api/runs/:id/events (SSE)
    ▼
Express Server (port 7456)
    │  spawn(agent, [prompt, ...], { OD_BIN, OD_PROJECT_ID, OD_PROJECT_DIR, OD_DAEMON_URL })
    ├─ Agent detection (6 CLIs)
    ├─ Prompt composer (7 layers: discovery → identity → MOTION.md → SCRIPT.md → SKILL.md → metadata → HF contract)
    ├─ Run manager (create, stream SSE, cancel, auto-cleanup)
    ├─ Media handler (/api/media/generate + /api/media/wait/:taskId → SSE progress)
    └─ HyperFrames bridge (lint, validate, inspect, render)
    │
    ├─ Agent calls: node "$OD_BIN" media generate --model hyperframes-html ...
    └─ Server runs: npx hyperframes render → Puppeteer + FFmpeg → MP4
```

## Directory layout

- `apps/web/`            — Next.js 16 frontend (SPA)
- `apps/server/`         — Express + SQLite backend
  - `src/prompts/`       — Video prompt stack (6 layers)
  - `src/renderer/`      — HyperFrames bridge
  - `src/agents.ts`      — Agent detection (6 CLIs)
  - `src/agent-runner.ts`— Agent spawner (sets OD_* env vars)
  - `src/runs.ts`        — Run manager + SSE
  - `src/db.ts`          — SQLite persistence
  - `src/media.ts`       — Media render pipeline
  - `src/projects.ts`    — File management
  - `src/cli.ts`         — `od` CLI (agent-facing dispatcher)
  - `src/motion-preview.ts` — Motion system preview HTML generator
- `packages/contracts/`  — Shared types
- `video-skills/`        — 6 video SKILL.md bundles
- `motion-systems/`      — 5 MOTION.md motion design systems
- `templates/`           — 2 HyperFrames blank scaffold templates
- `tools/dev/`           — `ov-dev` CLI (start/stop/status/build)
- `blocks/`              — (placeholder) Reusable HF blocks

## Key differences from Open Design

1. **Video-first prompt stack**: Discovery asks videoType, duration, energy, audio.
2. **MOTION.md instead of DESIGN.md**: Animation palettes, transition matrices, timing.
3. **HyperFrames as primary output**: Agent generates HF HTML, not web pages.
4. **Automatic render pipeline**: `od media generate` → server renders → MP4.
5. **`od` CLI dispatcher**: Agent-accessible media generation via `node "$OD_BIN"`.
6. **Dual preview**: Design mode (HTML iframe) + Playback mode (MP4 video).

## Common commands

```bash
pnpm install          # Install all workspace deps
pnpm dev              # Build + start server (ov-dev)
pnpm start            # Build server + run
pnpm status           # Check server health
pnpm stop             # Stop server
pnpm typecheck        # TypeScript check all packages
pnpm build            # Build all packages
pnpm --filter @code2mp4/server typecheck
```
