---
name: caption-reel-video
description: |
  Text-first caption-driven short video. Word-by-word reveals, beat-synced
  text animations, high-contrast typography. For social reels, lyric videos,
  quote animations. HyperFrames HTML → MP4.
triggers:
  - "caption reel"
  - "lyric video"
  - "text video"
  - "quote animation"
  - "subtitles"
  - "字体动画"
  - "字幕视频"
od:
  mode: video
  surface: video
  scenario: marketing
  preview:
    type: html
  design_system:
    requires: false
  example_prompt: |
    12-second lyric reel for a pop song chorus. Bold type, word-by-word reveal
    synced to beat, warm energy, cream canvas.
---

# Caption Reel Video

Produce a text-first, caption-driven video. Typography IS the visual.
Think like a typographer-animator: word rhythm beats image rhythm.

> **Skill root (absolute):** This skill's folder.

## When to use
- Lyric / quote videos (text is the visual)
- Social reels with bold text overlays
- Typography-driven brand statements
- Educational captions with emphasis highlights
- Word-by-word reveals for emphasis

## Workflow

### 1. Define the text and rhythm
- What's the full script? Break it into "lines" (2-6 words per visual)
- What's the beat? (BPM or manual rhythm)
- How long per line? (0.8–2s typically)

### 2. Choose a caption animation pattern

#### Pattern A: Word-by-word reveal (classic)
Each word appears sequentially with a pop or fade:
```js
tl.from("#w1", { scale: 1.2, opacity: 0, duration: 0.3, ease: "back.out(1.4)" }, 0);
tl.from("#w2", { scale: 1.2, opacity: 0, duration: 0.3, ease: "back.out(1.4)" }, 0.4);
tl.from("#w3", { scale: 1.2, opacity: 0, duration: 0.3, ease: "back.out(1.4)" }, 0.8);
```

#### Pattern B: Line reveal with highlight sweep
Entire line appears, then a highlight sweeps through:
```js
tl.from("#line", { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0);
// Highlight sweep: pseudo-element animates left-to-right
tl.fromTo("#line::after", { left: "0%" }, { left: "100%", duration: 0.4, ease: "power2.inOut" }, 0.3);
```

#### Pattern C: Scale slam (for key words)
Key words slam in with scale, body words fade:
```js
const KEY_WORDS = ["launch", "today", "free"];
// Key words: scale entrance
tl.from(".key-word", { scale: 1.5, opacity: 0, duration: 0.5, ease: "power4.out" });
// Body words: simple fade
tl.from(".body-word", { opacity: 0, duration: 0.3, ease: "power2.out" });
```

#### Pattern D: Typewriter (mono font)
Text reveals character by character:
```html
<div class="typewriter" data-start="0.5" data-duration="3"
     data-track-index="1" data-type="text"
     data-font-size="48" data-color="#fff"
     style="font-family: 'JetBrains Mono', monospace;">
  npm install open-video
</div>
```
```js
// Reveal via clip-path on the container
tl.from(".typewriter", {
  clipPath: "inset(0 100% 0 0)",
  duration: 1.5,
  ease: "steps(20)"
});
```

#### Pattern E: Karaoke fill (for lyric videos)
Text fills from left to right synced to audio:
```css
.text-fill {
  background: linear-gradient(to right, var(--accent) 50%, var(--muted) 50%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  background-size: 200% 100%;
  background-position: 100% 0;
}
```
```js
tl.to(".text-fill", {
  backgroundPosition: "0% 0",
  duration: 2,
  ease: "none"
});
```

### 3. Typography rules for caption reels
- Font size: 48–96px for primary, 24–40px for secondary
- High contrast: white text on dark bg, or black on light bg
- Text shadow for readability on video: `0 2px 8px rgba(0,0,0,0.6)`
- Maximum 2 lines visible at once
- Center-aligned for social (9:16), left-aligned for landscape
- `font-weight: 700` minimum for captions on video

### 4. Stagger timing
```js
// Beat-synced stagger (assuming ~120bpm = 0.5s per beat)
const BEAT = 0.5;
tl.from("#l1", { y: 20, opacity: 0, duration: 0.4, ease: "power2.out" }, 0);
tl.from("#l2", { y: 20, opacity: 0, duration: 0.4, ease: "power2.out" }, BEAT * 2);
tl.from("#l3", { y: 20, opacity: 0, duration: 0.4, ease: "power2.out" }, BEAT * 4);
```

## Output checklist
- [ ] Text sizes ≥ 24px (readable on mobile)
- [ ] Maximum 2 lines visible at once
- [ ] Text contrast against background verified
- [ ] Beat-synced staggers (not random timing)
- [ ] Key words differentiated from body (scale/color/easing)
- [ ] lint + validate + inspect pass
