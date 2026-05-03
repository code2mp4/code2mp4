---
name: motion-brand-intro
description: |
  Brand intro / logo animation video. 3-8 second opener with logo treatment,
  easing as personality, one decisive motion flourish. HyperFrames → MP4.
triggers:
  - "logo animation"
  - "brand intro"
  - "logo reveal"
  - "brand opener"
  - "motion brand"
  - "品牌动画"
  - "logo动画"
od:
  mode: video
  surface: video
  scenario: marketing
  preview:
    type: html
  design_system:
    requires: true
  example_prompt: |
    5-second brand opener for a tech startup called "Nova". Clean dark canvas,
    one neon accent, logo builds from particles, snap-locks with back.out easing.
---

# Motion Brand Intro

Produce a short (3-8 second) brand opener / logo animation.
Think like a motion designer: the easing IS the brand personality.

> **Skill root (absolute):** This skill's folder.

## The philosophy

A 5-second logo animation says more about a brand than a 30-second explainer.
The easing curve tells the story:
- `back.out` = playful, confident, modern
- `power4.out` = premium, decisive, luxury
- `power2.out` = calm, editorial, refined
- `elastic.out` = energetic, youthful, bouncy

## Workflow

### 1. Understand the personality
- Brand name + tagline?
- Logo available? (SVG, PNG, or text-only)
- What's the ONE word that describes this brand? → that word IS the easing
- Canvas: dark or light? (dark = dramatic, light = clean)

### 2. Choose the animation pattern

#### Pattern A: Type reveal (text-only logos)
Brand name types on, letter by letter, with a cursor blink:
```js
// Reveal headline character by character via clip-path
tl.from("#brand-name", {
  clipPath: "inset(0 100% 0 0)",
  duration: 0.8,
  ease: "power3.inOut"
}, 0.3);
```

#### Pattern B: Scale lock (icon + text)
Logo scales from 0→1.05→1 with overshoot, then text fades in:
```js
tl.from("#logo-icon", {
  scale: 0, rotation: -15, opacity: 0,
  duration: 0.7, ease: "back.out(1.7)"
}, 0.2);
tl.from("#brand-name", {
  y: 30, opacity: 0,
  duration: 0.5, ease: "power2.out"
}, 0.6);
```

#### Pattern C: Build from parts (complex logos)
Logo elements animate in sequence:
1. Base shape appears (fade + scale)
2. Accent element snaps in (rotation + scale)
3. Text lockup reveals (y-move + fade)
4. Tagline fades in last

```js
tl.from("#logo-base",   { scale: 0.8, opacity: 0, duration: 0.5, ease: "power3.out" }, 0);
tl.from("#logo-accent", { rotation: -45, scale: 0, opacity: 0, duration: 0.5, ease: "back.out(1.7)" }, 0.4);
tl.from("#brand-name",  { y: 40, opacity: 0, duration: 0.6, ease: "power2.out" }, 0.8);
tl.from("#tagline",     { opacity: 0, duration: 0.5, ease: "power1.out" }, 1.5);
```

#### Pattern D: Particle / glow (cinematic)
Brand name emerges from particles or glow:
- Background: radial gradient from center (accent glow)
- Brand name: `text-shadow: 0 0 40px accent, 0 0 80px accent`
- Reveal: `opacity: 0→1 + text-shadow intensity ramp`
- Optional: particles fading in from edges (CSS pseudo-elements with keyframe animation)

### 3. Audio (for intros)
- 3-8 seconds of atmospheric audio or a "sting" sound
- Add: `<audio data-start="0" data-duration="5" data-track-index="0" data-volume="0.6" src="sting.wav">`
- If using TTS: a single word or phrase at the brand lock moment

### 4. Ending
The animation should settle into a clean, static lockup for the final 1-1.5 seconds.
This gives the viewer time to absorb the brand. Do NOT fade out immediately.

## Timing template (5-second opener)
```
0.0-0.3s   — Canvas appears (simple, fast)
0.3-1.2s   — Logo builds (the main motion)
1.2-1.8s   — Brand name reveals
1.8-2.3s   — Tagline fades in
2.3-5.0s   — Static lockup (viewer absorbs brand)
5.0s       — End
```

## Non-negotiables
- One decisive motion flourish, not three
- Easing must match the brand personality word
- 1+ second of static lockup at the end
- No scene transitions (single scene composition)
- No body text — headlines and brand name only
- Canvas matches brand (not default gray)

## Output checklist
- [ ] 3-8 second duration
- [ ] Logo/brand name visible in final lockup
- [ ] Animation pattern chosen (A/B/C/D)
- [ ] Easing matches brand personality
- [ ] 1+ second static lockup at end
- [ ] Single scene (no transitions needed)
- [ ] lint + validate + inspect pass
