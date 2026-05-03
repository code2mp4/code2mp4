# Cinematic / Dramatic — Motion System
> Category: Media & Entertainment
> Surface: video
> Energy: dramatic

## Visual Atmosphere
Near-black canvas, warm gold + cool blue accents. Slow atmospheric builds, lens flares,
heavy typography. Think: movie title sequences, high-stakes product reveals,
luxury automotive reels.

## Color Palette
- **Canvas (background):** `#0A0A0A` — near-black, cinematic
- **Primary accent:** `#D4A853` — warm gold, premium
- **Secondary accent:** `#4A90D9` — cool blue, for contrast accents
- **Surface / card background:** `#141414`
- **Muted / subtle:** `#666666`
- **Border / rule:** `#2A2A2A` — subtle, barely visible
- **Text foreground:** `#EBEBEB` — near-white, filmic

## Typography
- **Display font:** Cormorant Garamond, Noto Serif SC, Bodoni Moda, serif
  - Size: 90–140px for hero headlines, 52–72px for subheads
  - Weight: 600 for primary, 400 for secondary
  - Letter-spacing: 0.04em (cinematic breathing room)
  - Line-height: 1.0
- **Body font:** Inter, SF Pro Text, system-ui, sans-serif
  - Size: 22–32px
  - Weight: 300 (light, cinematic feel)
  - Letter-spacing: 0.02em
  - Line-height: 1.6
- **Credit/meta font:** JetBrains Mono, SF Mono, monospace
  - Size: 16–20px
  - Used for: credits, timestamps, "A FILM BY"

## Easing Signatures
- **Entrance (hero titles):** `power4.out` — slow build, massive landing
- **Entrance (subheads/body):** `power3.out` — confident, weighted
- **Emphasis (accent hits):** `expo.out` — precise, elegant
- **Exit:** `power3.in` — dignified departure
- **Lens/camera moves:** `power3.inOut` — slow drift, smooth settle
- **Title slam (climax):** `power4.in` — sudden impact

## Transition Matrix
- **Default (scene→scene):** Zoom through / gravitational lens — `duration: 0.4s, ease: power3.inOut`
  - Outgoing: `scale: 1→1.2, opacity: 1→0` with radial blur
  - Incoming: `scale: 0.8→1, opacity: 0→1` with lens correction
- **Atmospheric (mood→mood):** Light leak / lens flare — `duration: 0.6s, ease: power2.inOut`
  - Warm gold flare sweeps across screen
- **Climax emphasis:** Flash through white — `duration: 0.1s, ease: none`
  - Brief white flash for dramatic punctuation
- **Ending:** Fade to black — `duration: 1.5s, ease: power2.in`
  - The only transition where a full fade is appropriate

## Typography Animation Rules
- **Hero title:** `scale: 1.05→1, opacity: 0→1, duration: 1.2s, ease: power4.out`
  - DO NOT animate hero titles with `y` — cinematic titles use scale for lens depth
- **Subhead:** `opacity: 0→1, duration: 0.8s, ease: power3.out`
  - Enter AFTER hero settles (delay: hero+0.5s)
- **Credit line:** `opacity: 0→1, duration: 0.6s, ease: power2.out`
  - Mono font, bottom-aligned, small
- **Title slam (for impact):** `scale: 0.9→1, opacity: 0→1, duration: 0.4s, ease: power4.in`
  - Use ONCE, at the emotional climax of the video
- **Never use:** `y` animation on display text, `rotation` on body text, `back.out` easing (too playful for cinematic)

## Timing & Rhythm
- **Slow builds are the feature:** 1.5–2.5s per element reveal
- **Opening scene:** 3–5s — atmosphere before any text
- **Content scene:** 5–8s — generous pacing
- **Climax moment:** 1–2s of acceleration
- **Ending credit:** 3–5s — slow fade to black
- **Minimum element hold:** 3s after reveal (cinematic = patient)
- **Stagger between entrances:** 0.5–1.0s (generous)

## Layout Principles
- Center-aligned for hero moments; left-aligned for credits
- Hero titles centered in frame, massive (100–140px)
- Credit blocks: bottom-left or bottom-right, small, mono
- Generous negative space — the canvas breathes
- Subtle vignette on background (radial gradient, canvas → darker at edges)

## Depth & Motion
- **Title glow:** `text-shadow: 0 0 40px rgba(212,168,83,0.3), 0 0 80px rgba(212,168,83,0.15)`
- **Background depth:** Subtle radial gradient from center
- **Camera:** Slow drift (scale: 1→1.03 over 8s), slight parallax
- **Lens flares:** Gold/copper colored, subtle (10-15% opacity)
- **Never:** Hard shadows, box shadows, card UI patterns

## Do's and Don'ts
- **DO** use scale as the primary entrance mechanism (lens feel)
- **DO** leave long pauses (1-3s) between text reveals
- **DO** use gold accent (`#D4A853`) for key moments only
- **DO** let the background atmosphere carry the eye
- **DON'T** animate more than 2 elements simultaneously
- **DON'T** use fast cuts or aggressive transitions
- **DON'T** use rounded corners, cards, or UI patterns
- **DON'T** use green, pink, or purple — cinematic palette only

## Anti-Slop Checklist
- [ ] Near-black canvas (`#0A0A0A`)
- [ ] Gold accent used ≤ 2 times
- [ ] Hero titles use scale (not y) for entrance
- [ ] Lens flare or zoom-through transition
- [ ] 3+ second atmospheric hold at start
- [ ] Slow fade to black at end (1.5s)
- [ ] No rounded UI, cards, or web patterns
- [ ] Font sizes ≥ 80px for hero titles
