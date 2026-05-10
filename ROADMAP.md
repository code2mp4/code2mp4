# Roadmap

## v0.1 ✅ — Stable local prompt-to-MP4 workflow
Single-pass agent generates HyperFrames HTML → rendered MP4.
- 6-layer prompt stack (discovery → identity → MOTION → SKILL → metadata → contract)
- 6 CLI agents auto-detected
- Claude Code verified: 506-line HF HTML → 1920×1080 MP4

## v0.2 ✅ — Agent adapters
- Claude Code, OpenCode, Codex CLI, Gemini CLI, Cursor Agent, Qwen Code
- SSE streaming, run lifecycle, cancel
- Agent picker in frontend
- API key stripping (security)

## v0.3 ✅ — Compact prompt stack
- Prompt size reduced from 35K → 20K chars
- MOTION.md tokens injected as compact summary, full file on disk
- SCRIPT.md narrative systems (3 types)
- 12 CRITICAL HyperFrames rules only in prompt
- Filesystem-accessible reference files via `--add-dir`

## v0.4 ✅ — Multi-stage pipeline
- Director Agent → storyboard generation (compact ~2K prompt)
- Scene Agent → per-scene HTML fragments (compact ~1K prompt)
- Assembly → pure code, no agent
- Per-scene status tracking (pending/running/done/failed)
- Scene retry (POST /api/pipeline/:id/scene/:num/retry)
- Partial assembly (render with any subset of completed scenes)
- Filesystem persistence (survives server restarts)

## v0.5 🔲 — Template gallery + ecosystem
- [ ] More motion systems (minimal, vintage, neon)
- [ ] More script systems (explainer, interview, unboxing)
- [ ] Template gallery in frontend — curate from HyperFrames 50+ registry blocks (texture-mask-text, VFX: liquid-background, shatter, portal, magnetic, text-cursor, iphone-device)
- [ ] Music library expansion (10+ tracks)
- [ ] SFX library with pre-made effects
- [ ] Examples directory
- [ ] Transcribe pipeline (audio → transcript → captions via hyperframes transcribe)
- [ ] Remove-background pipeline (presenter-overlay compositions via hyperframes remove-background)
- [ ] Composition variables support (parametrized templates via data-composition-variables + getVariables())

## v0.6 🔲 — CLI-first workflow
- [ ] `code2mp4 init` — project scaffolding (delegates to `hyperframes init`)
- [ ] `code2mp4 build` — render project to MP4
- [ ] `code2mp4 dev` — start local server (delegates to `hyperframes dev`)
- [ ] `code2mp4 storyboard` — generate storyboard from prompt
- [ ] `code2mp4 doctor` — health check (delegates to `hyperframes doctor`)
- [ ] 4K rendering support (via `hyperframes render --resolution 4k`)
- [ ] npm package: `code2mp4`

## v0.7 🔲 — Cloud & collaboration
- [ ] Hosted rendering experiments
- [ ] Shared project workspaces
- [ ] Community motion/script systems
- [ ] Discord / community forum

## v1.0 🔲 — Stable release
- [ ] Comprehensive documentation
- [ ] Full test coverage
- [ ] All 6 agents verified
- [ ] 10+ examples
- [ ] Landing page
- [ ] Video tutorials
