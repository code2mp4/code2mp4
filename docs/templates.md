# Template system

Code2MP4 templates provide pre-built starting points for common video types. Each template includes a HyperFrames HTML scaffold, a sample storyboard, and usage instructions.

## Available templates

| Template | Aspect | Scenes | Best for |
|---|---|---|---|
| [Product Launch](examples/product-launch/) | 16:9 | 4 (problem → promise → features → CTA) | SaaS product launches, feature announcements |
| [OSS Intro](examples/oss-intro/) | 16:9 | 4 (what → why → how → get started) | Open-source project intro videos |
| [Release Notes](examples/release-notes/) | 16:9 | 4 (version → features → improvements → upgrade) | Automated changelog-to-video |

## Blank scaffolds

| Template | Aspect | Description |
|---|---|---|
| `blank-landscape.html` | 1920×1080 | 3-scene scaffold with crossfade transitions, ready for content |
| `blank-portrait.html` | 1080×1920 | 3-scene vertical scaffold for social shorts |

## How templates work

### Storyboard-driven templates

The "heavy" templates under `examples/` work like this:

1. **`storyboard.json`** defines every scene — its goal, visual description, text, and motion spec
2. An agent reads the storyboard and generates HyperFrames HTML for each scene
3. The Code2MP4 pipeline assembles, checks, and renders

### Blank scaffolds

The `templates/` directory contains minimal, structural HTML files:

1. Correct viewport meta and stage dimensions
2. Scene containers with CSS for opacity-based visibility
3. Pre-wired GSAP CDN and `window.__timelines` registration
4. Crossfade transition pattern between scenes

These are starting points — agents replace the placeholder content.

## Creating a new template

1. **Write the storyboard** — define scenes, goals, visuals, text, and motion
2. **Choose a motion system** — pick from the 5 curated directions
3. **Create the example directory** — `examples/<template-name>/` with README + storyboard
4. **Add to this document** — link to the example and describe the use case
5. **Test the pipeline** — run through Code2MP4 end to end

## Design principles for templates

- **Storyboard first** — the `storyboard.json` is the contract, not an afterthought
- **Motion system bound** — every template declares which motion system it uses
- **Agent-editable** — templates are structured to be read and modified by agents, not just copied
- **Deterministic** — no random elements, no external API calls in the HTML

## Video skills

The 6 video skills in `video-skills/` complement the template system. While templates provide structural starting points, skills provide workflow rules, animation patterns, and output checklists.

When creating a video:

1. Pick a **template** for structure
2. Pick a **skill** for workflow
3. Pick a **motion system** for visual identity
4. Pick a **script system** for narrative pacing
