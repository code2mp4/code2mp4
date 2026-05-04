# Open Video

> **AI-driven video production — where design agents meet motion graphics.**

Open Video combines [Open Design][od]'s AI agent orchestration with [HyperFrames][hf]' HTML-to-MP4 rendering engine. Describe what you want — a product launch, a social reel, a brand intro — and an AI coding agent writes a HyperFrames composition, renders it to MP4, and streams the result back to your browser. **BYOK at every layer.**

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="#agents"><img alt="Agents" src="https://img.shields.io/badge/agents-6%20CLIs%20auto--detected-black?style=flat-square" /></a>
  <a href="#motion-systems"><img alt="Motion systems" src="https://img.shields.io/badge/motion%20systems-5-orange?style=flat-square" /></a>
  <a href="#video-skills"><img alt="Skills" src="https://img.shields.io/badge/skills-6-teal?style=flat-square" /></a>
  <a href="#quickstart"><img alt="Quickstart" src="https://img.shields.io/badge/quickstart-3%20commands-green?style=flat-square" /></a>
</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

---

## Why this exists

AI video generation today falls into two camps: photoreal text-to-video (Kling, Veo, Sora) that gives you a black-box output you can barely edit, and manual timeline editors (After Effects, DaVinci) that give you control but demand expertise. There is no open tool that lets an AI agent compose, animate, and render a video from a text prompt — with full source visibility and editability.

**Open Video fills this gap.** It combines two proven open-source paradigms:

- **[Open Design][od]** taught us how to turn any coding-agent CLI into a design engine through prompt stacking, interactive discovery forms, skill-driven workflows, and a real filesystem-backed project model.
- **[HyperFrames][hf]** taught us that video can be authored as a single HTML file — with `data-*` attributes for timing and GSAP for animation — and rendered frame-accurately via Puppeteer + FFmpeg.

The result: you type "Make a 15-second product launch video", the agent asks clarifying questions (video type? duration? energy? audio needs?), scaffolds a HyperFrames composition, authors the animation, runs lint + validate + inspect, dispatches the render, and streams an MP4 back to your browser. The entire composition — HTML, CSS, GSAP timeline — is yours to edit.

## Demo

<p align="center">
  <img src="docs/demo-preview.gif" alt="Open Video Demo" width="640" />
</p>
<p align="center"><b>60s demo</b> · 1920×1080 · background music + SFX · <a href="docs/demo.mp4">Download MP4</a></p>

---

## Architecture

```
Browser (Next.js 16 SPA)
    │  POST /api/runs    GET /api/runs/:id/events (SSE)    GET /api/projects/:id/files
    ▼
Express Server (port 7456)
    │  spawn(agent, [systemPrompt + userMessage], { OD_BIN, OD_PROJECT_DIR, ... })
    ├─ Agent detection: 6 CLIs auto-detected on PATH
    ├─ Prompt stack: 6 layers (discovery → identity → MOTION.md → SKILL.md → metadata → HF contract)
    ├─ Run manager: create, stream SSE, cancel, auto-cleanup
    ├─ Media pipeline: /api/media/generate → task → npx hyperframes render → MP4
    └─ SQLite persistence: projects, conversations, messages
    │
    ├─ Agent calls: node "$OD_BIN" media generate --model hyperframes-html ...
    └─ Server runs: npx hyperframes render → Puppeteer + FFmpeg → MP4
```

---

## At a glance

| | What you get |
|---|---|
| **Agents** | Claude Code · OpenCode · Codex CLI · Gemini CLI · Cursor Agent · Qwen Code — auto-detected on `PATH`, swap with one click |
| **Motion systems** | 5 curated directions (Editorial · Tech · Warm & Soft · Cinematic · Brutalist) — each ships a deterministic palette, font stacks, easing signatures, transition rules, and an anti-slop checklist |
| **Video skills** | 6 composable workflows (Product Launch · Social Short · Tutorial · Brand Intro · Caption Reel · Audio Reactive) — each with scene templates, animation patterns, and output checklists |
| **Prompt stack** | 6 layers stacked in order: video discovery (7-question form) → expert producer identity → active MOTION.md → active SKILL.md → project metadata → HyperFrames contract (load-bearing, pinned last) |
| **Rendering** | Agent writes HF HTML → `od media generate` dispatches to daemon → `npx hyperframes render` (unsandboxed, Puppeteer) → SSE progress → MP4 in project folder |
| **Preview** | Dual-mode: `<hyperframes-player>` web component (GSAP seek, timeline scrubber) + `<video>` tag for rendered MP4 |
| **File workspace** | Auto-polling file browser with download/preview, dotfile filtering, type icons |
| **Persistence** | SQLite (projects · conversations · messages with CASCADE), filesystem as ground truth |
| **Multi-turn** | Conversation tabs, message history, agent tool-call display in chat |
| **CLI** | `od` agent dispatcher (media generate/wait/health) + `ov-dev` lifecycle (start/stop/status) |
| **CI** | GitHub Actions: typecheck + build + test on push |
| **Tests** | 49 unit tests (prompts, agents, db, motion-systems, skills, projects) |
| **License** | Apache 2.0 |

---

## Quickstart

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10 (`corepack enable && corepack prepare pnpm@10 --activate`)
- **An AI agent CLI** — pick one:
  ```bash
  npm i -g @anthropic-ai/claude-code   # Claude Code (recommended)
  npm i -g opencode                     # OpenCode
  npm i -g @google/gemini-cli          # Gemini CLI
  ```
- **HyperFrames** (for rendering): `npm i -g hyperframes`
- **FFmpeg** (for video encoding): `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)

### 3 commands to start

```bash
git clone https://github.com/openvideo-ai/openvideo.git
cd open-video
pnpm install && pnpm dev
```

Open `http://localhost:7456`. Pick a video type from the sidebar, describe what you want, and press send.

### Your first video

1. **Create a project**: Pick "Product Launch" from the sidebar, set aspect to 16:9, duration 15s, energy Medium, motion system Tech.
2. **Describe**: Type "A 15-second product launch for a ceramic coffee mug. Warm lighting, slow push-in, feature callouts on weight and heat retention."
3. **Agent works**: The agent scaffolds a HyperFrames composition (`data-*` attributes, GSAP timeline), runs lint + validate, dispatches the render.
4. **Play**: The rendered MP4 appears in your project files and the video player.

---

## How it works

### The prompt stack

The agent receives a 6-layer composed system prompt, in this exact order:

| Layer | Content | Why |
|-------|---------|-----|
| 1. Video Discovery | Hard rules for turn 1-3: emit a `<question-form>` on turn 1, branch on motion system choice on turn 2, TodoWrite plan on turn 3 | Prevents the model from improvising before the user's intent is locked |
| 2. Video Identity | "You are an expert video producer and motion designer..." — full identity charter, workflow, and output rules | Shifts the model's self-perception from "web designer" to "video producer" |
| 3. MOTION.md | Active motion design system (palette, fonts, easing signatures, transition matrix, anti-slop checklist) | Deterministic visual tokens — no model-invented colors |
| 4. SKILL.md | Active video skill (scene templates, animation patterns, output checklists) | Domain-specific workflow for each video type |
| 5. Project Metadata | User's pre-selected options (duration, orientation, energy, audio needs, copy) | Authoritative defaults — model doesn't re-guess |
| 6. HF Contract | HyperFrames composition rules (data-* cheat sheet, GSAP pattern, scene transition template, linter workflow, render dispatcher) — pinned LAST | Load-bearing — overrides any softer wording above |

### The agent loop

```
Turn 1: Agent emits <question-form id="video-discovery"> — 7 questions lock down the brief
Turn 2: Branch on motion_system answer:
        → "Pick a direction" → second form with 5 visual direction cards
        → "I have a reference" → brand extraction, write motion-spec.md
        → else → TodoWrite directly
Turn 3+: TodoWrite plan → scaffold → layout → animate → lint → render → critique
```

### The render pipeline

```
Agent writes index.html in .hf-cache/
    │
    ▼
Agent calls: node "$OD_BIN" media generate --project "$OD_PROJECT_ID" \
              --surface video --model hyperframes-html --output "output.mp4" \
              --composition-dir ".hf-cache/comp-xxx"
    │
    ▼  POST /api/media/generate
Server creates async render task, returns { taskId, status: 'running' }
    │
    ▼  Agent polls: node "$OD_BIN" media wait <taskId> --since 0
Server streams SSE: { type: 'progress', frame: 45, totalFrames: 360 }
    │
    ▼  Render complete
Server returns: { file: { name: "output.mp4", size: 2450000, kind: "video" } }
```

---

## Directory layout

```
open-video/
├── apps/
│   ├── web/                   # Next.js 16 SPA frontend
│   │   └── src/components/    # EntryView, ProjectView, VideoPreview, FileWorkspace, MotionSystemPicker
│   └── server/                # Express + SQLite backend
│       └── src/
│           ├── prompts/       # 6-layer prompt stack
│           ├── renderer/      # HyperFrames bridge (lint, validate, inspect, render)
│           ├── agents.ts      # Agent detection (6 CLIs)
│           ├── agent-runner.ts# Agent spawner (OD_* env vars)
│           ├── runs.ts        # Run manager + SSE streaming
│           ├── db.ts          # SQLite persistence
│           ├── media.ts       # Media render pipeline (video + TTS)
│           ├── projects.ts    # File management
│           ├── cli.ts         # `od` CLI (agent-facing dispatcher)
│           └── motion-preview.ts # Motion system preview HTML generator
├── packages/contracts/        # Shared types
├── video-skills/              # 6 SKILL.md bundles
├── motion-systems/            # 5 MOTION.md systems
├── templates/                 # HyperFrames blank scaffold templates
├── tools/dev/                 # `ov-dev` lifecycle CLI
└── .github/workflows/         # CI (typecheck + build + test)
```

---

## Motion design systems

Each system is a single `MOTION.md` file with 8 sections: Atmosphere → Palette → Typography → Easing → Transitions → Timing → Layout → Do's & Don'ts.

| System | Canvas | Accent | Font | Energy |
|--------|--------|--------|------|--------|
| **Editorial** | `#F5F0EB` | `#C44F34` | Playfair Display | calm—medium |
| **Tech** | `#0D1117` | `#58A6FF` | JetBrains Mono | medium—high |
| **Warm & Soft** | `#FAF7F2` | `#D97757` | Quicksand | calm—medium |
| **Cinematic** | `#0A0A0A` | `#D4A853` | Cormorant Garamond | dramatic |
| **Brutalist** | `#EBE5D9` | `#E53935` | Helvetica Now | high / aggressive |

---

## Video skills

| Skill | Best for | Scene structure |
|-------|----------|-----------------|
| **Product Launch** | Marketing promos, feature reveals | 5 scenes: Hero → Feature 1 → Feature 2 → Specs → CTA |
| **Social Short** | TikTok, Reels, Shorts | 3 acts: Hook (0.5s) → Body → Payoff (last 2s) |
| **Tutorial** | How-to videos, explainers | 3-6 numbered steps, code blocks, generous timing |
| **Brand Intro** | Logo animations, openers | 4 patterns: Type reveal / Scale lock / Build from parts / Particle glow |
| **Caption Reel** | Lyric videos, quote animations | 5 text patterns: Word-by-word / Line reveal / Scale slam / Typewriter / Karaoke fill |
| **Audio Reactive** | Music visualizers, beat-sync | 4 visual patterns: Pulse ring / Glow burst / Text bounce / Color shift |

---

## Development

```bash
pnpm install          # Install all workspace deps
pnpm dev              # Start server
pnpm typecheck        # TypeScript check all packages
pnpm build            # Build all packages
pnpm test             # Run 49 unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage report
pnpm status           # Check server health
```

Filter by package:
```bash
pnpm --filter @open-video/server typecheck
pnpm --filter @open-video/web build
```

---

## Standing on shoulders

Open Video exists because of the groundbreaking work of these projects:

### Open Design
**[nexu-io/open-design](https://github.com/nexu-io/open-design)** — The open-source alternative to Claude Design. Open Design pioneered the architecture that Open Video inherits: **prompt stacking** (discovery → identity → design system → skill → metadata — the exact layered composition pattern), **agent auto-detection** (scanning PATH for 13 coding-agent CLIs), **interactive question forms** (XML blocks that the frontend parses into live forms before the agent writes a single pixel), **the `agents.ts` pattern** for buildArgs/streamFormat per CLI, the **`runs.ts` SSE manager**, and the **skill + design-system loader** pattern (YAML frontmatter parsing from `SKILL.md` and `DESIGN.md`). Our `video-discovery.ts` is a direct conceptual adaptation of their `discovery.ts`. Our 6-layer `composeVideoSystemPrompt` mirrors their `composeSystemPrompt`. Without Open Design's daemon-first, BYOK-at-every-layer architecture, Open Video would not exist.

### HyperFrames
**[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)** — HTML-first video composition and rendering. HyperFrames is the rendering engine that makes Open Video possible: the insight that a video can be authored as a **single HTML file** with `data-*` attributes for timing and GSAP for animation, and rendered **frame-accurately** via Puppeteer + FFmpeg. We use HyperFrames' CLI (`npx hyperframes {init,lint,validate,inspect,render,tts,transcribe}`), its `<hyperframes-player>` web component for preview, its `visual-styles.md` pattern (which inspired our `MOTION.md` format), and its `registry.json` block ecosystem. HyperFrames ships as a peer dependency and is called through our `hyperframes-bridge.ts` and `media.ts` render pipeline.

### GSAP
**[GreenSock/GSAP](https://gsap.com)** — The animation engine that powers every HyperFrames composition. All video motion in Open Video runs through GSAP timelines (`gsap.timeline({ paused: true })`), using GSAP's easing library (`power3.out`, `back.out(1.7)`, `elastic.out(1,0.3)`), and GSAP's deterministic seek model that makes frame-accurate rendering possible.

### Additional inspiration
- **[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)** — Design philosophy (Junior-Designer workflow, anti-AI-slop checklist, 5-dimension self-critique) that shaped our discovery and philosophy directives.
- **[op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)** — Slide skill architecture (seed template + layout library + checklist) that inspired our video skill structure.
- **[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — The DESIGN.md schema that our MOTION.md format extends for motion design.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome contributions of new motion systems, video skills, HyperFrames templates, and agent adapters.

Before submitting a PR, run:
```bash
pnpm typecheck && pnpm build && pnpm test
```

---

## License

Apache 2.0 © 2026 Open Video contributors. See [LICENSE](LICENSE) for details.

Third-party dependencies are used under their respective licenses. See [NOTICE](NOTICE) for attribution details.

[od]: https://github.com/nexu-io/open-design
[hf]: https://github.com/heygen-com/hyperframes
