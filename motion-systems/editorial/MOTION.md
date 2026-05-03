# Editorial Monocle — Motion System
> Category: Media & Editorial
> Surface: video
> Energy: calm—medium

## Visual Atmosphere
Confident, refined, serif-forward. Warm off-white canvas with a single rust accent.
Generous breathing room. Slow push-ins. Reads like a Sunday magazine cover in motion.

## Color Palette
- **Canvas (background):** `#F5F0EB`
- **Primary accent:** `#C44F34` — warm rust, used for key headlines and CTA
- **Secondary accent:** `#2C3A42` — deep slate, used for body text and secondary elements
- **Surface / card background:** `#FFFFFF`
- **Muted / subtle:** `#D4CFC8`
- **Divider / rule:** `#C4BFB8`

## Typography
- **Display font:** Playfair Display, Noto Serif SC, Georgia, serif
  - Size: 80–130px for headlines, 48–64px for subheads
  - Weight: 700 for primary, 400 for secondary
  - Letter-spacing: -0.02em
  - Line-height: 1.05
- **Body font:** Source Serif 4, Noto Serif, Georgia, serif
  - Size: 24–36px
  - Weight: 400
  - Letter-spacing: -0.01em
  - Line-height: 1.45
- **Mono font (for meta/data):** JetBrains Mono, SF Mono, monospace
  - Size: 16–20px
  - Used for: timestamps, labels, source citations

## Easing Signatures
- **Entrance (headlines):** `power2.out` — confident, no bounce
- **Entrance (body/subhead):** `power1.out` — subtle, deferential
- **Emphasis (accent elements):** `expo.out` — decisive landing
- **Exit:** `power1.in` — quiet, dignified
- **Camera/zoom:** `power3.inOut` — slow build, smooth stop

## Transition Matrix
- **Default (scene→scene):** Blur crossfade — `duration: 0.6s, ease: sine.inOut`
  - Outgoing: `filter: blur(0px)` → `filter: blur(12px)` + `opacity: 1` → `0`
  - Incoming: `filter: blur(12px)` → `filter: blur(0px)` + `opacity: 0` → `1`
- **Topic change (section→section):** Push right — `duration: 0.4s, ease: power2.inOut`
  - Outgoing: `x: 0` → `x: -60, opacity: 0`
  - Incoming: `x: 60, opacity: 0` → `x: 0, opacity: 1`
- **Climax emphasis:** Gentle zoom through — `duration: 0.5s, ease: power3.inOut`
  - Outgoing: `scale: 1` → `scale: 1.15, opacity: 0`
  - Incoming: `scale: 0.9, opacity: 0` → `scale: 1, opacity: 1`

## Typography Animation Rules
- **Headline entrance:** `y: 50→0, opacity: 0→1, duration: 0.7s, ease: power2.out, delay: 0.1s from scene start`
- **Subhead entrance:** `y: 30→0, opacity: 0→1, duration: 0.5s, ease: power2.out, delay: headline+0.2s`
- **Body paragraph:** `opacity: 0→1, duration: 0.4s, line-by-line stagger: 0.15s`
- **Accent rule / divider line:** `scaleX: 0→1, duration: 0.5s, ease: power2.out, delay: headline+0.3s`
- **Never use:** `scale` on text (causes render blur), `rotation` on body text

## Timing & Rhythm
- **Opening scene:** 2.0–3.0s — headline reveal + settle
- **Content scene:** 3.0–5.0s — body + supporting elements
- **Closing scene:** 2.0–3.0s — CTA / logo lockup
- **Transition gap:** 0.6s (included in scene timing)
- **Minimum element hold:** 1.5s after entrance complete (before exit)
- **Stagger between entrances:** 0.15–0.3s

## Layout Principles
- Heavily padded: 120–200px padding on all sides
- Left-aligned or center-aligned text; never right-aligned body
- Single focal point per scene (one headline dominates)
- Rules/dividers are 1px, full accent color, 60–120px wide
- Generous whitespace between elements (gap: 32–64px)

## Depth & Motion
- No hard shadows (editorial = flat)
- Subtle drop shadow on text when over imagery: `text-shadow: 0 1px 4px rgba(0,0,0,0.15)`
- Background stays solid color; no gradient fades
- Camera moves are subtle (max 5% scale over 3s)

## Do's and Don'ts
- **DO** use the rust accent sparingly — at most twice per scene
- **DO** let text breathe — 120px+ padding, generous line-height
- **DO** use the mono font for datelines, timestamps, author bylines
- **DON'T** use gradients on backgrounds (banding risk with H.264)
- **DON'T** use bold weight on body text — display weight handles emphasis
- **DON'T** stack more than 3 lines of body text in one visual
- **DON'T** animate body text with y-movement (reads as distracting)
- **DON'T** use Inter, Roboto, or system fonts as display

## Anti-Slop Checklist
- [ ] Accent used ≤ 2 times in the composition
- [ ] No gradient backgrounds
- [ ] Actual copy (not "Feature One")
- [ ] Font sizes ≥ 20px all text
- [ ] Scene transitions present (if multi-scene)
- [ ] Easing curves vary across tweens (not all power2.out)
- [ ] No dead zones > 1.5s with no animation
