# Brutalist / Experimental — Motion System
> Category: Art & Experimental
> Surface: video
> Energy: high / aggressive

## Visual Atmosphere
Raw newsprint canvas, hazard red + phosphor white. Oversized grotesque, no shadows,
hard cuts. Think: art-film openers, experimental fashion reels, underground music
visuals, CRT terminal aesthetics.

## Color Palette
- **Canvas (background):** `#EBE5D9` — raw newsprint, unbleached
- **Primary accent:** `#E53935` — hazard red, aggressive
- **Secondary accent:** `#1A1A1A` — near-black, for text and contrast
- **Surface / card background:** `#FFFFFF` — stark, no gradients
- **Muted / subtle:** `#9E9E9E`
- **Border / rule:** `#000000` — 1px solid black, unapologetic
- **Text foreground:** `#1A1A1A` — black on print

## Typography
- **Display font:** Helvetica Now, Inter Tight, Impact, sans-serif
  - Size: 100–160px for headlines, 48–72px for subheads
  - Weight: 800 (ExtraBold/Black) for primary, 700 for secondary
  - Letter-spacing: -0.03em (crushed together)
  - Line-height: 0.90 (vertically compressed)
- **Body font:** JetBrains Mono, Fira Code, monospace
  - Size: 20–28px
  - Weight: 400
  - Letter-spacing: 0.02em
  - Line-height: 1.3
- **Type experimentation allowed:** mixed weights in single headlines, overlapping text, rotated blocks

## Easing Signatures
- **Entrance (headlines):** `power3.in` — fast, aggressive attack
- **Entrance (subheads):** `power2.in` — sharp, no settling
- **Emphasis:** `power4.in` — maximum aggression
- **Exit:** `none` — instant disappearance (hard cut)
- **Glitch/text scramble:** `steps(8)` — discrete ticks
- **Reveal/unveil:** `none` — instant (brutalist = no transitional niceties)

## Transition Matrix
- **Default (scene→scene):** Hard cut — `duration: 0s, ease: none`
  - Instant switch. No crossfade. No blur. No dissolve.
- **Emphasis beat:** Whip pan — `duration: 0.15s, ease: none`
  - Rapid horizontal displacement + blur + instant new scene
- **Glitch transition:** `duration: 0.2s, ease: steps(8)`
  - Chromatic offset + horizontal slice + instant new scene
- **Strobe flash:** `duration: 0.08s, ease: none`
  - Alternating black/white flashes for rhythmic punctuation

## Typography Animation Rules
- **Headline slam:** `scale: 1.3→1, opacity: 0→1, duration: 0.3s, ease: power3.in`
  - Oversized entry, aggressive overshoot
- **Text scramble/glitch:** `rotation: [-3, 5, -2, 0], opacity: [0,1,0,1], duration: 0.3s, ease: steps(3)`
  - Use once, on the hero headline, for a glitch-reveal effect
- **Hard cut text:** `duration: 0s, ease: none` — new text simply appears
- **Typewriter reveal:** `clip-path: inset(0 100% 0 0 → 0 0% 0 0), duration: 0.5s, ease: steps(20)`
  - Mono font, each character ticks in
- **Never use:** `power2.out`, `sine.inOut`, `back.out` (too soft)

## Timing & Rhythm
- **Opening scene:** 0.5–1.5s — immediate assault
- **Content scene:** 1.0–3.0s — fast, dense, aggressive
- **Closing scene:** 0.5–1.0s — abrupt end
- **Transition gap:** 0s (hard cuts = instant)
- **Minimum element hold:** 0.5–1.0s (brutalist = no lingering)
- **Stagger between entrances:** 0.05–0.1s (tight, overlapping)

## Layout Principles
- Asymmetric composition — nothing is "balanced"
- Text bleeding off edges is acceptable and intentional
- Oversized elements: headlines at 120–160px, touching or overlapping
- Black rules/borders at 2–4px (thicker than editorial 1px)
- Grid is a suggestion, not a law — break it
- Negative space is white canvas, not darkness

## Depth & Motion
- **Absolutely NO shadows** — brutalist is flat, print-like
- **NO gradients** — solid colors only
- **NO glow** — not even on the hazard red
- **NO rounded corners** — every corner is 0px
- **NO motion blur** — hard edges always

## Do's and Don'ts
- **DO** use oversize — text that bleeds off the canvas is intentional
- **DO** mix font weights aggressively within a single scene
- **DO** use the red accent (`#E53935`) like a hazard warning — once, loud
- **DO** experiment with rotated text blocks (90°, 180°, 270°)
- **DON'T** use any easing other than `power*.in` or `steps()`
- **DON'T** add shadows, gradients, or soft edges
- **DON'T** use serif fonts — grotesque + mono only
- **DON'T** center-align anything — brutalist is asymmetric by nature
- **DON'T** use rounded corners anywhere

## Anti-Slop Checklist
- [ ] Newsprint canvas (`#EBE5D9`) or pure black/white
- [ ] No shadows, no gradients, no soft edges
- [ ] Hazard red used ≤ 2 times
- [ ] No rounded corners anywhere
- [ ] At least one element bleeds off canvas
- [ ] Easing curves are `power*.in` or `steps()` only
- [ ] No `power*.out`, `sine`, `back`, or `elastic` easing
- [ ] No serif fonts
- [ ] Asymmetric layout (not centered)
- [ ] Minimum font size ≥ 20px (no tiny labels)
