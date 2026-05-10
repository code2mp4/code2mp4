# Changelog

All notable changes to Code2MP4 are documented in this file.

## [Unreleased] — 2026-05-10

### Repositioning

Code2MP4's project expression has been restructured around its core identity as an **agent-native video production pipeline** — not a code-to-MP4 format converter.

- **README rewritten**: New first-screen positioning with Mermaid architecture diagram, comparison table ("Black-box text-to-video" vs "Code2MP4"), and clear distinction from HyperFrames and Open Design
- **AGENTS.md rewritten**: Now an executable SOP for coding agents — step-by-step workflow, HyperFrames contract rules, project directory conventions, and a "never do" list
- **New documentation**: `docs/vision.md` (why agents need video output), `docs/comparison.md` (vs Sora, Remotion, HyperFrames, Open Design), `docs/architecture.md` (full pipeline with Mermaid diagrams), `docs/agent-workflow.md` (step-by-step for agents), `docs/storyboard-schema.md` (formal JSON schema with validation rules), `docs/templates.md` (template system guide)

### Examples

Three new complete examples with storyboard.json and README:
- `examples/product-launch/` — 30s SaaS product launch (problem → promise → 3 features → CTA)
- `examples/oss-intro/` — Code2MP4 self-intro video (what → why → how → get started)
- `examples/release-notes/` — changelog-to-video (version → features → improvements → upgrade)

### Fixes

- **Templates**: Fixed viewport meta from `width=device-width` to fixed dimensions (HF contract rule #4)
- **Templates**: Removed `data-composition-id` from `<html>`, moved to `#stage` div only
- **Templates**: Replaced push-transition pattern with proper crossfade (HF skill "Scene Transitions" rule #3)
- **Templates**: Removed non-standard `data-resolution` attribute
- **FPS default**: Changed from 24fps → 30fps to match HyperFrames CLI default
- **TTS argument handling**: Fixed shell splitting of prompt text with `--` separator

### Additions

- **Transcribe pipeline**: `generateTranscribe()` in bridge for audio→text→captions workflow
- **Remove-background pipeline**: `generateRemoveBackground()` in bridge for presenter-overlay compositions
- **Bridge functions**: Added `initProject`, `previewProject`, `runDoctor` wrappers for HyperFrames CLI
- **Contract rules**: Expanded from 12 to 23 rules covering variables system, sub-compositions, inspect quality gate, `gsap.set()` and `<br>` prohibitions, transitions catalog reference
- **Motion system fallback**: System prompt now guides agents to pick a visual identity when no motion system is selected (prevents browser defaults)
- **Roadmap**: Updated with HyperFrames 50+ registry blocks reference, transcribe/remove-bg pipelines, 4K rendering, CLI delegation

### Dependencies

- **@hyperframes/player**: Bumped from `^0.4.43` → `^0.5.0`

---

## [0.1.0] — 2026-05-04

### 🎬 Initial Release

First public release of Code2MP4 — AI-driven video production combining Open Design's agent orchestration with HyperFrames' HTML-to-MP4 rendering.

### Core
- **6-layer prompt stack**: video discovery → identity → MOTION.md → SKILL.md → metadata → HyperFrames contract
- **6 AI agent CLIs**: auto-detection of Claude Code, OpenCode, Codex CLI, Gemini CLI, Cursor Agent, Qwen Code on PATH
- **Run manager**: create, stream SSE, cancel, auto-cleanup with 30-min TTL
- **SSE streaming**: real-time agent output (text_delta, tool_use, tool_result, status, end)
- **SQLite persistence**: projects, conversations, messages with CASCADE delete
- **File management**: CRUD with dotfile filtering, MIME detection, path traversal safety
- **Render pipeline**: `od media generate` → async task → `npx hyperframes render` → SSE progress → MP4
- **TTS pipeline**: `od media generate --surface audio` → `npx hyperframes tts` → WAV
- **`od` CLI**: agent-facing dispatcher (media generate, media wait, health)
- **`ov-dev` CLI**: dev lifecycle (start, stop, status, build, typecheck)

### Motion Systems
- **5 systems**: Editorial, Tech, Warm & Soft, Cinematic, Brutalist
- Each MOTION.md: 8 sections (atmosphere → palette → typography → easing → transitions → timing → layout → do's & don'ts)
- Preview generation: auto-generates sample HF HTML with system tokens

### Video Skills
- **6 skills**: Product Launch, Social Short, Tutorial, Brand Intro, Caption Reel, Audio Reactive
- Each SKILL.md: YAML frontmatter + workflow + scene templates + animation patterns + output checklist

### Frontend
- **EntryView**: project list with server health check, skeleton loading, error states
- **ProjectView**: chat + video preview + file workspace, multi-turn conversations
- **NewVideoProjectPanel**: 6-dimension project config (type, aspect, duration, energy, motion, audio)
- **MotionSystemPicker**: visual card grid with swatch bars and live preview iframes
- **VideoPreview**: `<hyperframes-player>` web component + `<video>` tag, timeline scrubber, keyboard controls
- **FileWorkspace**: auto-polling file browser with download/preview, type icons
- **ErrorBoundary**: crash recovery with reload
- **Design system**: CSS custom properties, component classes (btn, card, chip, spinner, skeleton, toast, tooltip)
- **Accessibility**: ARIA roles, labels, keyboard navigation
- **Keyboard shortcuts**: ⌘Enter send, Esc close/cancel, ⌘B toggle files

### Templates
- **2 HyperFrames scaffolds**: blank-landscape (1920×1080, 3-scene) and blank-portrait (1080×1920, 3-scene)
- Both include GSAP CDN, `window.__timelines` registration, scene transitions

### Engineering
- **49 unit tests**: prompts, agents, db, motion-systems, video-skills, projects (Vitest)
- **CI**: GitHub Actions (typecheck + build + test on push)
- **TypeScript**: strict mode, ESM, 5 workspace packages
- **pnpm**: workspace monorepo with build ordering
- **Gitignore**: dist, .next, out, .ov, projects, node_modules, SQLite files

### Documentation
- README.md (English, comprehensive)
- README.zh-CN.md (简体中文)
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- CHANGELOG.md
- LICENSE (Apache 2.0)
- NOTICE (third-party attribution)
- AGENTS.md (internal architecture guide)

### Acknowledgments
Built on the shoulders of:
- [Open Design](https://github.com/nexu-io/open-design) — agent orchestration, prompt stacking, daemon architecture
- [HyperFrames](https://github.com/heygen-com/hyperframes) — HTML-first video composition and rendering
- [GSAP](https://gsap.com) — animation engine
- [huashu-design](https://github.com/alchaincyf/huashu-design) — design philosophy
- [guizang-ppt](https://github.com/op7418/guizang-ppt-skill) — skill architecture
