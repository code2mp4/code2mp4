---
name: audio-reactive-video
description: |
  Audio-reactive visual video. Beat-synced glow, pulse, color shift, and motion
  driven by music amplitude and frequency bands. HyperFrames HTML → MP4.
triggers:
  - "audio reactive"
  - "beat sync"
  - "music visualizer"
  - "audio visual"
  - "sound reactive"
  - "音乐可视化"
  - "音频响应"
od:
  mode: video
  surface: video
  scenario: marketing
  preview:
    type: html
  design_system:
    requires: false
  example_prompt: |
    8-second audio-reactive title card for a tech podcast intro.
    Dark canvas, cyan pulses on bass hits, glitch transitions on snare.
---

# Audio Reactive Video

Produce visuals that respond to audio. Beat-synced glow, pulse, color shifts,
and motion driven by music amplitude and frequency bands.

> **Skill root (absolute):** This skill's folder.

## Core concept

Audio-reactive visuals map audio analysis data to GSAP tweens:
- **Amplitude (volume)** → scale, opacity, glow intensity
- **Low frequencies (bass)** → background pulse, large element scale
- **Mid frequencies (vocals/snare)** → text animation triggers
- **High frequencies (hi-hats)** → fast shimmer, particle effects

## Setup

Audio-reactive compositions need an `<audio>` element and waveform data:
```html
<audio id="track" data-start="0" data-duration="8"
       data-track-index="0" src="music.mp3" data-volume="1"></audio>
```

Pre-compute beat times for deterministic GSAP animation:
```js
// Beat times extracted from audio analysis (pre-computed, not real-time)
const BEATS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const SNARES = [1.0, 3.0, 5.0];
const BASS_HITS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

// Map beats to GSAP tweens
const tl = gsap.timeline({ paused: true });

BEATS.forEach((t, i) => {
  tl.to("#pulse", {
    scale: 1.05,
    duration: 0.1,
    ease: "power2.out"
  }, t);
  tl.to("#pulse", {
    scale: 1,
    duration: 0.15,
    ease: "power2.in"
  }, t + 0.1);
});

SNARES.forEach((t) => {
  tl.to("#glow", {
    opacity: 0.6,
    duration: 0.05,
    ease: "power4.in"
  }, t);
  tl.to("#glow", {
    opacity: 0,
    duration: 0.3,
    ease: "power2.out"
  }, t + 0.05);
});
```

## Visual patterns

### Pattern A: Pulse ring (bass hits)
A glowing ring that scales up on each bass hit:
```css
.pulse-ring {
  position: absolute;
  inset: 40%;
  border: 2px solid var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--accent), 0 0 60px var(--accent);
  opacity: 0.3;
}
```
```js
BASS_HITS.forEach((t) => {
  tl.to("#ring", { scale: 1.3, opacity: 0.6, duration: 0.08, ease: "power4.out" }, t);
  tl.to("#ring", { scale: 1.0, opacity: 0.3, duration: 0.3, ease: "power2.out" }, t + 0.08);
});
```

### Pattern B: Glow burst (snare/clap)
Full-screen radial glow that flashes on percussive hits:
```css
.glow-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
}
```

### Pattern C: Text bounce (beat-synced)
Text elements bounce slightly on every beat:
```js
BEATS.forEach((t) => {
  tl.to("#headline", { y: -8, duration: 0.08, ease: "power2.out" }, t);
  tl.to("#headline", { y: 0, duration: 0.15, ease: "power2.in" }, t + 0.08);
});
```

### Pattern D: Color shift (frequency-mapped)
Background color shifts with the dominant frequency:
```js
// Map: bass→warm, mid→neutral, high→cool
// Pre-compute color keyframes:
const FREQ_COLORS = [
  { t: 0, color: "#1a0a2e" },  // bass-heavy intro
  { t: 2, color: "#0a1a2e" },  // mid-range verse
  { t: 4, color: "#1a2e0a" },  // high-energy chorus
];
FREQ_COLORS.forEach(({ t, color }) => {
  tl.to("#stage", { backgroundColor: color, duration: 0.5, ease: "power2.inOut" }, t);
});
```

## Determinism rule
Audio-reactive effects MUST use pre-computed beat times, NOT real-time
`AudioContext` analysis. The capture engine needs frame-level determinism.
Extract beat times from the audio file once, hardcode the array, and map
to GSAP tweens.

## Output checklist
- [ ] Beat times pre-computed (not real-time analysis)
- [ ] Audio element with correct data-start/data-duration
- [ ] Bass hits → scale/pulse effects
- [ ] Snares → flash/glow effects
- [ ] Visuals work sound-off (captions or clear visual rhythm)
- [ ] No `AudioContext` or real-time analysis in code
- [ ] lint + validate + inspect pass
