# Neon / Cyber — Motion System
> Category: Retro-Future & Synthwave
> Surface: video
> Energy: high / electric

## Visual Atmosphere
Dark void canvas, hot magenta + electric cyan accents. Neon tube glow, scanline overlays,
chrome gradients. Think: 80s synthwave music videos, cyberpunk title sequences, retro-future
brand reels, Chrome experiments. Maximalist within a dark frame — every element emits light.

## Color Palette
- **Canvas (background):** `#0A0A14` — deep void, nearly black with violet undertone
- **Primary accent:** `#FF00FF` — hot magenta, neon tube glow
- **Secondary accent:** `#00FFFF` — electric cyan, cool contrast to magenta
- **Surface / card background:** `#120D1F` — dark purple wash, subtle depth
- **Muted / subtle:** `#6B5B8A` — lavender grey
- **Border / rule:** `#2A1F3D` — deep violet, 1px
- **Text foreground:** `#F0E6FF` — soft violet-white, easier on eyes than pure white
- **Glow accent (optional):** `#FFD700` — gold, used sparingly for premium highlights

## Typography
- **Display font:** Orbitron, Share Tech Mono, Rajdhani, sans-serif
  - Size: 80–140px for headlines, 40–60px for subheads
  - Weight: 900 for primary, 700 for secondary
  - Letter-spacing: 0.05em (futuristic breathing)
  - Line-height: 1.05
  - Text-transform: uppercase on hero headlines
- **Body font:** Exo 2, Rajdhani, Inter, sans-serif
  - Size: 22–34px
  - Weight: 400
  - Letter-spacing: 0.01em
  - Line-height: 1.5
- **Data / stats font:** Share Tech Mono, monospace
  - Size: 18–28px
  - Used for: timestamps, coordinates, HUD elements, counters

## Easing Signatures
- **Entrance (headlines):** `expo.out` — dramatic deceleration, neon tube warming up
- **Entrance (HUD / data):** `power2.out` — clean digital reveal
- **Emphasis (glow pulse):** `sine.inOut` — smooth neon flicker, repeat 1-2x
- **Exit:** `power3.in` — fast z-axis retreat, like pixels powering down
- **Chromatic shift / glitch:** `steps(6)` — discrete RGB offset jumps
- **Sweep / beam reveal:** `power2.inOut` — light beam passing over element

## Transition Matrix
- **Default (scene→scene):** Chromatic dissolve — `duration: 0.3s, ease: power2.inOut`
  - RGB channels split briefly then recombine on incoming scene
- **Energy beat / drop:** Flash frame — `duration: 0.12s, ease: none`
  - Single-frame white flash between high-energy moments
- **Section change:** Neon wipe — `duration: 0.4s, ease: power3.inOut`
  - Cyan or magenta horizontal beam sweeps across, revealing new content
- **Intro / outro:** Scanline reveal — `duration: 0.5s, ease: power2.out`
  - Content materializes from top to bottom with scanline effect

## Typography Animation Rules
- **Headline entrance:** `opacity: 0→1, filter: blur(8px)→blur(0px)`, `duration: 0.6s, ease: expo.out`
- **Neon glow-on:** `text-shadow: 0 0 0→20px currentColor, 0 0 0→60px currentColor`, `duration: 0.4s, ease: power2.out`
- **HUD element reveal:** `opacity: 0→1, x: -20→0`, `duration: 0.3s, ease: power2.out`, stagger: 0.06s
- **Counter / stat roll:** `opacity: 0→1, count-up: 0.6s, ease: power2.out`
- **Chromatic aberration text** (hero only): simultaneous `x: -2` cyan clone + `x: +2` magenta clone, `duration: 0.15s, ease: steps(4)`, then resolve
- **Never use:** `scale` on neon-glow text (blurs the glow into a smudge)

## Timing & Rhythm
- **Opening scene:** 2.0–3.0s — magnetic hook, immediate glow-on
- **Content scene:** 2.5–4.0s — fast cuts, high information turnover
- **Closing scene:** 2.0–3.0s — CTA with pulsing neon border
- **Transition gap:** 0.2–0.3s (tight, electric)
- **Minimum element hold:** 0.8s after glow-on (glow needs settling time)
- **Stagger between entrances:** 0.06–0.12s (rapid-fire)

## Layout Principles
- 80–120px padding (tighter — neon needs edge proximity to feel immersive)
- Center-aligned for hero moments; left-aligned for HUD/data sections
- Neon frames: 2px borders with `0 0 12px currentColor` glow on all card edges
- Subtle grid lines at 5% opacity forming a perspective grid (tech-HUD feel)
- Chrome/metal gradient bars as section dividers (magenta→cyan→magenta `linear-gradient(90deg)`)
- Scanline overlay: repeating `linear-gradient(transparent 0px, rgba(0,255,255,0.03) 1px)` at 3px intervals

## Depth & Motion
- Primary text glow: `text-shadow: 0 0 10px currentColor, 0 0 40px currentColor` — sharper than tech, less diffusion
- Secondary text glow: `text-shadow: 0 0 6px currentColor` — subtle HUD glow
- Neon borders: 2px solid with `box-shadow: 0 0 12px` matching border color
- Chrome elements: `linear-gradient(135deg, #FF00FF, #00FFFF)` on select accents
- No conventional box-shadows — all depth comes from glow and chrome
- Background: subtle `radial-gradient(ellipse at center, #1A0F2E 0%, #0A0A14 70%)` for depth

## Do's and Don'ts
- **DO** use magenta (`#FF00FF`) as primary glow, cyan (`#00FFFF`) as secondary/cool contrast
- **DO** keep backgrounds dark — neon loses impact on bright canvases
- **DO** use uppercase for display headlines (synthwave aesthetic)
- **DO** favor chromatic transitions (RGB split, beam wipe, flash frame)
- **DON'T** use conventional crossfade transitions (wrong energy)
- **DON'T** use serif fonts anywhere
- **DON'T** use rounded corners > 2px (angular = futuristic)
- **DON'T** animate opacity without glow — plain fade = dead pixel energy
- **DON'T** overuse both magenta and cyan on the same element (competing glows create visual noise)

## Anti-Slop Checklist
- [ ] Dark void canvas (`#0A0A14`) confirmed, with radial gradient depth
- [ ] Orbitron / Share Tech Mono / Rajdhani used for display
- [ ] Neon glow text-shadow on ALL primary text (not just hero)
- [ ] No conventional crossfades — chromatic or beam transitions only
- [ ] Scanline overlay present on backgrounds
- [ ] Uppercase on hero headlines
- [ ] Font sizes ≥ 18px (HUD/body), ≥ 60px (headlines)
- [ ] No serif fonts, no grey-background cards, no box-shadows
- [ ] [Optional] Chrome gradient bar present as section divider
