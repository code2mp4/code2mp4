---
name: social-short-video
description: |
  Social media short-form video. Vertical 9:16 format, fast rhythm, bold text,
  hook in first 0.5s. TikTok, Reels, Shorts style. HyperFrames HTML → MP4.
triggers:
  - "social short"
  - "reel"
  - "tiktok"
  - "shorts"
  - "vertical video"
  - "社交媒体短片"
  - "短视频"
od:
  mode: video
  surface: video
  scenario: marketing
  preview:
    type: html
  design_system:
    requires: false
  example_prompt: |
    8-second vertical reel for a coffee brand. Fast cuts, bold white text on
    warm footage, hook in first 0.3 seconds, beat-synced transitions.
---

# Social Short Video

Produce platform-native short-form vertical video (9:16).
Think like a content creator: fast hook, bold visuals, rhythmic pacing.

> **Skill root (absolute):** This skill's folder.

## Platform rules

- **Resolution:** 1080×1920 (portrait)
- **Safe zones:** Keep text within 200px of left/right edges, 300px from top/bottom
- **Hook:** First 0.3–0.5s must grab attention (bold text, motion, flash)
- **Duration:** 3–15 seconds (ideal: 5–8s)
- **Sound-off compatible:** Visuals must work without audio
- **Loop-friendly:** Consider making the last frame lead back to the first

## Workflow

### 1. Define the hook
What's the ONE thing the viewer sees in the first 0.5 seconds?
- Bold headline slam (120px+, center, accent color)
- Quick product flash
- "This is the thing" reveal

### 2. Structure (3-act mini-narrative)
1. **Hook** (0–1s) — Grab attention. Bold visual + minimal text.
2. **Body** (1s–end-2s) — The content. Features, steps, benefits.
3. **Payoff** (last 2s) — CTA, brand, or loop-back.

### 3. Scaffold
```bash
COMP=".hf-cache/short-$(date +%s)"
npx hyperframes init "$COMP" --example blank --skip-skills --non-interactive
# Edit data-resolution="portrait", data-width="1080", data-height="1920"
```

### 4. Fast rhythm rules
- 3-6 visual cuts in 8 seconds
- Each "cut" = a new text element appearing or scene switch
- Maximum 2 lines of text visible at any moment
- Text size: 48–96px for headlines, 28–42px for supporting
- DON'T use transitions between every element — that's a short's visual language

### 5. Beat-synced animation
```js
// Sync entrance to implicit beat (assuming ~120bpm, 0.5s per beat)
tl.from("#hook", { scale: 1.2, opacity: 0, duration: 0.3, ease: "power3.out" }, 0);
tl.from("#sub1", { y: 40, opacity: 0, duration: 0.4, ease: "back.out(1.2)" }, 1.5);
tl.from("#sub2", { y: 40, opacity: 0, duration: 0.4, ease: "power2.out" }, 3.0);
tl.from("#cta",  { scale: 1.1, opacity: 0, duration: 0.5, ease: "elastic.out(1,0.3)" }, 5.5);
```

## Visual patterns

### Pattern 1: Bold text on footage
- Full-bleed background video/image
- Bold white text with thick text-shadow for contrast
- `text-shadow: 0 4px 12px rgba(0,0,0,0.5)`

### Pattern 2: Color-block text
- Solid color background (canvas color)
- Colored text (accent color)
- Rapid text swaps with scale transitions

### Pattern 3: Split screen
- Left: visual, Right: text (for feature highlights)
- Or Top: visual, Bottom: text

## Non-negotiables
- Text NEVER smaller than 28px (mobile screens are small)
- Hook in first 0.5 seconds — no slow fades at start
- 9:16 vertical ONLY (1080×1920)
- Sound-off legible — captions or bold visuals work without audio
- No scene transitions (shorts use hard cuts between elements, not scenes)

## Output checklist
- [ ] 1080×1920 resolution
- [ ] Hook element visible at t=0 or within 0.3s
- [ ] Minimum text size 28px
- [ ] Sound-off legible
- [ ] 3-8 visual beats
- [ ] lint + validate + inspect pass
- [ ] Rendered MP4 plays at target duration
