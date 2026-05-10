/**
 * HyperFrames video composition contract — CRITICAL rules only.
 * Full reference files are on disk via --add-dir.
 */
export const HYPERFRAMES_CONTRACT = `
---

## HyperFrames CRITICAL rules (load-bearing — violating any = broken video)

### Composition structure
1. **class="clip" REQUIRED** on every element with data-start+data-duration.
2. **data-composition-id ONLY on #stage div**, NOT on <html> (Producer reads first match, defaults to 1080×1920 portrait).
3. **NO track-index overlap** — clips on same track must not overlap in time.
4. **NEVER width=device-width in viewport meta** — use fixed canvas: <meta name="viewport" content="width=1920,height=1080">.
5. **html,body { width:1920px; height:1080px; overflow:hidden }** — must match data-width/data-height exactly.

### Animation & rendering
6. **window.__timelines["comp-id"] = gsap.timeline({ paused: true })** — MANDATORY pattern.
7. **No Math.random(), Date.now(), repeat:-1, async timeline construction.**
8. **Animate only visual properties** (opacity,x,y,scale,rotation) — not visibility/display.
9. **Video elements: muted playsinline. Audio: separate <audio> element.**
10. **Font sizes ≥ 20px body, ≥ 60px headlines.**

### Variables system (parametrized compositions)
11. **data-composition-variables on <html>** — declare per-composition variables as JSON array of {id, type, label, default}. Required for parametrized rendering.
12. **window.__hyperframes.getVariables()** — read resolved variable values in script. Returns merged defaults + CLI overrides.
13. **data-variable-values on sub-comp hosts** — per-instance overrides for sub-compositions loaded via data-composition-src.
14. **--variables '{"key":"value"}'** — CLI override for declared variables at render time.

### Sub-compositions
15. **Sub-compositions use <template> wrapper** — files loaded via data-composition-src MUST wrap content in <template id="...">. Standalone index.html must NOT use <template>.
16. **data-composition-src on host** — loads external HTML as a sub-composition. Each instance declares its own data-start, data-duration, data-track-index.
17. **Sub-comp timeline registration** — each sub-comp registers its own window.__timelines entry. The framework auto-nests; do NOT manually add sub-timelines to the parent.

### Scene transitions
18. **Scene transitions mandatory for multi-scene compositions.** Choose from: crossfade (opacity), directional wipe (x/y with clip-path), or shader transitions (WebGL). The transition IS the exit — never animate elements out before the transition fires. Full implementation catalog at transitions/catalog.md in the hyperframes skill references.

### Never do
19. **NEVER gsap.set() on elements that don't exist at page load** — clips from later scenes are not in the DOM. Use tl.set() at the clip's data-start time instead.
20. **NEVER <br> in body/caption text** — forced line breaks don't account for rendered font width. Use max-width and natural wrapping. Exception: display titles with deliberate per-word line breaks at 120px+.

### Quality gates
21. **Palette must match active MOTION.md tokens.**
22. **Run npx hyperframes lint before render** — catches structural errors (missing clip class, overlapping tracks, invalid data-* attrs).
23. **Run npx hyperframes inspect after composition** — catches text overflow, clipping, off-canvas elements. Must pass before render. Tag intentional overflow with data-layout-allow-overflow.

Full HyperFrames reference (data attributes, scene templates, GSAP patterns, TTS, captions, variables) is available on disk at motion-systems/ and video-skills/. Use your Read tool to access files when you need detailed guidance.
`;
