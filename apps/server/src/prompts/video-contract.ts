/**
 * HyperFrames video composition contract — CRITICAL rules only.
 * Full reference files are on disk via --add-dir.
 */
export const HYPERFRAMES_CONTRACT = `
---

## HyperFrames CRITICAL rules (load-bearing — violating any = broken video)

1. **class="clip" REQUIRED** on every element with data-start+data-duration.
2. **data-composition-id ONLY on #stage div**, NOT on <html> (Producer reads first match, defaults to 1080×1920 portrait).
3. **NO track-index overlap** — clips on same track must not overlap in time.
4. **NEVER width=device-width in viewport meta** — use fixed canvas: <meta name="viewport" content="width=1920,height=1080">.
5. **html,body { width:1920px; height:1080px; overflow:hidden }** — must match data-width/data-height exactly.
6. **window.__timelines["comp-id"] = gsap.timeline({ paused: true })** — MANDATORY pattern.
7. **No Math.random(), Date.now(), repeat:-1, async timeline construction.**
8. **Animate only visual properties** (opacity,x,y,scale,rotation) — not visibility/display.
9. **Video elements: muted playsinline. Audio: separate <audio> element.**
10. **Font sizes ≥ 20px body, ≥ 60px headlines.**
11. **Palette must match active MOTION.md tokens.**
12. **Scene transitions mandatory for multi-scene compositions.**

Full HyperFrames reference (data attributes, scene templates, GSAP patterns, TTS, captions) is available on disk at motion-systems/ and video-skills/. Use your Read tool to access files when you need detailed guidance.
`;
