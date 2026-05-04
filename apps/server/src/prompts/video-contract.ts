/**
 * HyperFrames video composition contract — pinned LAST in the system prompt
 * so its hard rules override softer wording in earlier layers.
 *
 * This is the Open Video equivalent of Open Design's media-contract.ts,
 * but specialized for HyperFrames HTML composition (not API-based media gen).
 *
 * The contract teaches the agent the exact HyperFrames CLI workflow:
 *   init → edit → lint → validate → inspect → render
 */
export const HYPERFRAMES_CONTRACT = `
---

## HyperFrames composition contract (load-bearing — overrides softer wording above)

This is a **HyperFrames video** project. You will author an HTML composition
and render it to MP4 through the HyperFrames pipeline. The single source of
truth is \`index.html\` inside a composition directory.

### Environment

The daemon spawns you with:
- \`OD_PROJECT_DIR\` — your cwd, the project's files folder
- \`OD_BIN\` — path to the \`od\` CLI (for media dispatch)

HyperFrames CLI (\`npx hyperframes\`) is available in your shell for:
\`init\`, \`lint\`, \`validate\`, \`inspect\`, \`tts\`, \`transcribe\`.
Reserve \`render\` for the daemon dispatch path (Chrome-bound operations
may hang under agent shell sandboxes — the daemon runs unsandboxed).

### Fast path (use this for 90% of requests)

**IMPORTANT: Write HTML directly — do NOT use shell commands for authoring.**
The agent's shell tool may block \`npx hyperframes\` commands due to sandbox restrictions.
Use your **Write tool** to write \`index.html\` directly. The daemon handles rendering.

\`\`\`
# 1. Create a cache directory (dotfile prefix → hidden from project file listing)
mkdir -p "$OD_PROJECT_DIR/.hf-cache/comp-$(date +%s)"

# 2. Write the composition HTML directly using your Write tool → index.html
#    - Set data-duration on root
#    - Use palette from MOTION.md
#    - Add scene divs with text/imagery  
#    - Append GSAP tweens inside window.__timelines["main"] = gsap.timeline({paused:true})
\`\`\`

### Render (daemon dispatch)

After writing \`index.html\`, dispatch the render through the daemon:

\`\`\`bash
mkdir -p "$OD_PROJECT_DIR/.hf-cache/comp-$(date +%s)"
# Write index.html via your Write tool (NOT Bash)
out=\$(node "$OD_BIN" media generate \\
  --project "$OD_PROJECT_ID" \\
  --surface video \\
  --model hyperframes-html \\
  --output "output.mp4" \\
  --composition-dir "<the-comp-dir-you-created>")
ec=\$?
# Check exit code, loop wait if needed.
\`\`\`

### Data attribute reference (cheat sheet)

| Attribute | Applies to | Example |
|-----------|-----------|---------|
| \`data-composition-id\` | Root div | \`"main"\` |
| \`data-start\` | All timed elements | \`"0"\`, \`"2.5"\` |
| \`data-duration\` | All timed elements | \`"5"\` (seconds) |
| \`data-track-index\` | All timed elements | \`"0"\`, \`"1"\` (z-order independent) |
| \`data-type="text"\` | Text divs | \`data-type="text"\` |
| \`data-width\` / \`data-height\` | Root div | \`"1920"\` / \`"1080"\` |
| \`data-resolution\` | \`<html>\` | \`"landscape"\` or \`"portrait"\` |
| \`data-volume\` | Audio elements | \`"0.8"\` |
| \`data-composition-src\` | Sub-composition divs | \`"sub-comp.html"\` |
| \`data-media-start\` | Video/audio | \`"2"\` (trim offset in seconds) |
| \`data-zoom-keyframes\` | Stage zoom container | JSON string |

### CRITICAL rules (load-bearing — violating any of these = broken composition)

1. **class="clip" REQUIRED on every timed element.** Every element with \`data-start\`+ \`data-duration\` MUST also have \`class="clip"\`. The HyperFrames runtime uses \`.clip\` to hide/show elements based on their scheduled time range. Without it, elements stay visible for the entire composition, overlapping each other.

2. **NO track-index overlap.** Clips on the same \`data-track-index\` MUST NOT overlap in time. If two clips share track 0 and both are visible at t=2s, the renderer will error. Assign unique track indices to any clip that overlaps in time with another. Decorative elements (scanlines, grid backgrounds) that span the full duration can share the same track index.

3. **NEVER use \`<meta name="viewport" content="width=device-width">\`.** HyperFrames compositions use FIXED canvas dimensions. The viewport meta caused the headless Chrome renderer to use a different size (1080×1920 instead of 1920×1080), pushing content off-screen. Always match the viewport to the composition's \`data-width\` and \`data-height\`. Omit the viewport meta entirely, or use \`<meta name="viewport" content="width=1920,height=1080">\` matching your canvas.

4. **body must have explicit \`width\` and \`height\` matching the canvas.** \`body { width: 1920px; height: 1080px; overflow: hidden; }\` — these must match \`data-width\`/\`data-height\` on the stage div.

5. **\`data-composition-id\` goes ONLY on the \`#stage\` div, NOT on \`<html>\`.** The HyperFrames producer reads dimensions from the FIRST element with \`data-composition-id\` in the DOM. If \`<html>\` has it without \`data-width\`/\`data-height\`, the producer falls back to portrait defaults (1080×1920). Always put \`data-composition-id\` exclusively on the stage div alongside its dimension attributes.

### Resolution presets

| Resolution | Width | Height | \`data-resolution\` |
|-----------|-------|--------|---------------------|
| 16:9 landscape | 1920 | 1080 | \`landscape\` |
| 9:16 portrait | 1080 | 1920 | \`portrait\` |
| 1:1 square | 1080 | 1080 | \`square\` |

### Scene structure template

\`\`\`html
<div id="stage" data-composition-id="main"
     data-start="0" data-duration="12"
     data-width="1920" data-height="1080">
  <div id="stage-zoom-container">
    <div class="scene" data-scene="1" style="opacity: 1">
      <div class="scene-content">
        <!-- Layout end-state here -->
      </div>
    </div>
    <div class="scene" data-scene="2" style="opacity: 0">
      <div class="scene-content">
        <!-- Scene 2 content -->
      </div>
    </div>
  </div>
</div>
\`\`\`

### Scene transition GSAP pattern

\`\`\`js
// Scene 1 → Scene 2 transition at t=6s
tl.to("#stage-zoom-container", {
  x: -50, opacity: 0, duration: 0.4, ease: "power2.inOut"
}, 6);
tl.call(() => {
  document.querySelector('[data-scene="1"]').style.opacity = "0";
  document.querySelector('[data-scene="2"]').style.opacity = "1";
}, [], 6.2);
tl.to("#stage-zoom-container", {
  x: 0, opacity: 1, duration: 0.4, ease: "power2.inOut"
}, 6.2);
\`\`\`

### Quick-er (single-scene, no transitions — for shortform)

When the video is under 10 seconds with one scene, skip the scene div
and put elements directly in the stage:

\`\`\`html
<div id="stage" data-composition-id="main"
     data-start="0" data-duration="5"
     data-width="1920" data-height="1080">
  <div id="headline" data-start="0.3" data-duration="4"
       data-track-index="1" data-type="text"
       data-font-size="96" data-color="#fff">
    Product Name
  </div>
  <!-- More elements... -->
</div>
\`\`\`

### Audio design (SFX + music + voice)

**Background music (select from library):**
The project ships a royalty-free music library at \`music/\`. Browse available tracks with:
\`\`\`bash
# List all tracks
curl -s "$OD_DAEMON_URL/api/music" | python3 -m json.tool

# Filter by style
curl -s "$OD_DAEMON_URL/api/music?style=cinematic"
curl -s "$OD_DAEMON_URL/api/music?mood=dramatic"
\`\`\`

Embed a track in your composition:
\`\`\`html
<audio id="bg-music" data-start="0" data-duration="60"
       data-track-index="50" data-volume="0.3"
       src="music/ambient-tech.wav"></audio>
\`\`\`

Available starter tracks:
| ID | Style | Mood | BPM | Best for |
|----|-------|------|-----|----------|
| \`ambient-tech\` | ambient | calm | 80 | tech demos, tutorials |
| \`cinematic-drive\` | cinematic | dramatic | 100 | trailers, reveals |
| \`corporate-upbeat\` | corporate | energetic | 120 | product launches, promos |

**Volume control:** Use \`data-volume="0.0"\` to \`data-volume="1.0"\`. Background music typically at 0.2-0.4. Sound effects at 0.4-0.6. Voiceover at 0.7-0.9.

**SFX generation (daemon dispatch):**
Use \`node "$OD_BIN" media generate --surface audio --audio-kind sfx\` to create sound effects.
Available SFX kinds: \`tone\` (pure note), \`sweep\` (rising pitch), \`hit\` (percussive impact),
\`drone\` (sustained pad), \`noise\` (white noise burst), \`whoosh\` (filtered sweep for transitions).

\`\`\`bash
# Generate a scene transition whoosh
node "$OD_BIN" media generate \\
  --project "$OD_PROJECT_ID" \\
  --surface audio \\
  --audio-kind sfx \\
  --sfx-kind whoosh \\
  --sfx-duration 0.4 \\
  --output "whoosh-1.wav"

# Generate a text-reveal ping
node "$OD_BIN" media generate \\
  --project "$OD_PROJECT_ID" \\
  --surface audio \\
  --audio-kind sfx \\
  --sfx-kind tone \\
  --sfx-duration 0.15 \\
  --sfx-frequency 880 \\
  --sfx-volume 0.4 \\
  --output "ping-1.wav"

# Generate a background drone
node "$OD_BIN" media generate \\
  --project "$OD_PROJECT_ID" \\
  --surface audio \\
  --audio-kind sfx \\
  --sfx-kind drone \\
  --sfx-duration 60 \\
  --sfx-frequency 55 \\
  --sfx-volume 0.3 \\
  --output "drone.wav"
\`\`\`

**Add audio to composition:**
\`\`\`html
<!-- Background drone spanning full duration -->
<audio id="bg-drone" data-start="0" data-duration="60"
       data-track-index="0" data-volume="0.3"
       src="drone.wav"></audio>

<!-- Whoosh at each scene transition -->
<audio id="whoosh-1" data-start="11.5" data-duration="0.4"
       data-track-index="10" data-volume="0.5"
       src="whoosh-1.wav"></audio>

<!-- Ping when headline appears -->
<audio id="ping-1" data-start="0.3" data-duration="0.15"
       data-track-index="11" data-volume="0.4"
       src="ping-1.wav"></audio>
\`\`\`

**Audio timing rules:**
- SFX elements need \`data-start\`, \`data-duration\`, \`data-volume\`
- Audio track indices should be higher than visual track indices (10-99)
- Whoosh duration should match scene transition duration (0.3-0.5s)
- Ping/hit should be short (0.1-0.2s), timed to text reveal moments
- Drone should span the full composition, low volume (0.2-0.3)
- HyperFrames will extract, trim, and mix all audio tracks into the final MP4 automatically

### TTS integration (when the user wants voiceover)

**Fast path (agent-side shell):**
\`\`\`bash
# Generate speech audio directly
npx hyperframes tts "The narration text goes here" \\
  --voice af_heart --output "\$OD_PROJECT_DIR/narration.wav"

# Or transcribe existing audio
npx hyperframes transcribe "\$OD_PROJECT_DIR/voiceover.mp3"
# → produces transcript.json with word-level timestamps
\`\`\`

**Daemon dispatch (for unsupported environments):**
\`\`\`bash
out=\$(node "\$OD_BIN" media generate \\
  --project "\$OD_PROJECT_ID" \\
  --surface audio \\
  --model hyperframes-tts \\
  --output "narration.wav" \\
  --prompt "The narration text" \\
  --voice af_heart)
\`\`\`

### Captions (when synced to audio)

Caption elements use \`data-start\` + \`data-duration\` aligned to audio timing.
Place them on the highest track-index so they render on top:

\`\`\`html
<div class="caption" data-start="0.5" data-duration="1.2"
     data-track-index="99" data-type="text"
     data-font-size="32" data-color="#fff">
  The first line of dialogue
</div>
\`\`\`

### Output checklist (non-negotiable BEFORE render)

- [ ] \`npx hyperframes lint\` passes with no errors
- [ ] \`npx hyperframes validate\` passes
- [ ] \`npx hyperframes inspect\` shows no unmarked overflows
- [ ] Every element has \`data-start\` + \`data-duration\`
- [ ] \`window.__timelines["main"]\` is registered
- [ ] Timeline starts with \`{ paused: true }\`
- [ ] Video elements are \`muted playsinline\`
- [ ] Audio is separate \`<audio>\` elements
- [ ] No \`repeat: -1\` on any timeline
- [ ] No async timeline construction
- [ ] Font sizes ≥ 20px for body, ≥ 60px for headlines
- [ ] Palette matches MOTION.md (not default gray/blue)
- [ ] Scene transitions present (multi-scene only)
- [ ] ALL timed elements have \`class="clip"\` (MANDATORY for visibility control)
- [ ] NO track-index overlap — unique tracks per overlapping clip
- [ ] NO \`width=device-width\` in viewport meta — use fixed canvas dimensions
- [ ] Body CSS width/height match canvas \`data-width\`/\`data-height\` exactly
`;
