# Tech / Terminal — Motion System
> Category: Developer & Engineering
> Surface: video
> Energy: medium—high

## Visual Atmosphere
Dark canvas, neon-signal accents. Monospace display typography. Data-dense compositions.
Grid dissolves, glitch transitions. Think: developer conference openers, API launch reels.

## Color Palette
- **Canvas (background):** `#0D1117` — GitHub-dark, near-black
- **Primary accent:** `#58A6FF` — signal blue, neon glow on dark
- **Secondary accent:** `#3FB950` — signal green, for success states and highlights
- **Surface / card background:** `#161B22`
- **Muted / subtle:** `#8B949E`
- **Border / rule:** `#30363D` — subtle, 1px
- **Text foreground:** `#E6EDF3`

## Typography
- **Display font:** JetBrains Mono, Fira Code, SF Mono, monospace
  - Size: 72–100px for headlines, 42–56px for subheads
  - Weight: 700 for primary, 500 for secondary
  - Letter-spacing: 0.02em (monospace breathing room)
  - Line-height: 1.1
- **Body font:** Inter, SF Pro Text, system-ui, sans-serif
  - Size: 22–32px
  - Weight: 400
  - Letter-spacing: -0.01em
  - Line-height: 1.5
- **Code/data font:** JetBrains Mono (same as display, smaller)
  - Size: 18–24px
  - Used for: code snippets, terminal output, stats, numerics

## Easing Signatures
- **Entrance (headlines):** `power3.out` — fast, confident landing
- **Entrance (code/terminal):** `power2.out` — typewriter-speed reveal
- **Emphasis (accent elements):** `back.out(1.4)` — slight overshoot, techie feel
- **Exit:** `power2.in` — quick, no lingering
- **Glitch transitions:** `power4.in` — aggressive, sudden
- **Count-up animations:** `power2.out` — smooth digit rolls

## Transition Matrix
- **Default (scene→scene):** Grid dissolve — `duration: 0.25s, ease: power2.inOut`
  - Dissolve outgoing into incoming via tile reveal (4×3 grid)
- **Topic change:** Glitch dissolve — `duration: 0.2s, ease: none`
  - Rapid chromatic offset + horizontal displacement + dissolve
- **Emphasis beat:** Flash through white — `duration: 0.15s, ease: power4.in`
  - Brief white flash between key moments
- **Code/data transition:** Terminal wipe — `duration: 0.3s, ease: power2.inOut`
  - Top-to-bottom reveal with scanline effect

## Typography Animation Rules
- **Headline entrance:** `y: 40→0, opacity: 0→1, duration: 0.5s, ease: power3.out`
- **Code block reveal:** `clip-path: inset(0 0 100% 0)` → `clip-path: inset(0 0 0% 0)`, `duration: 0.4s, ease: power2.out`, per-line stagger: 0.1s
- **Number/stats entrance:** `opacity: 0→1, duration: 0.3s, count-up animation: 0.8s`
- **Glitch text effect** (used once, on hero): `keyframes: [offset(0.05), offset(-0.05), offset(0.02), offset(-0.03)]`, `duration: 0.3s, ease: steps(4)`
- **Never use:** `scale` on monospace text (distorts glyph proportions)

## Timing & Rhythm
- **Opening scene:** 1.5–2.5s — fast hook
- **Content scene:** 2.0–4.0s — data/code dense, fast reveals
- **Closing scene:** 1.5–2.0s — CTA / logo lockup
- **Transition gap:** 0.25s (tight, confident)
- **Minimum element hold:** 1.0s after entrance
- **Stagger between entrances:** 0.08–0.15s (faster than editorial)

## Layout Principles
- 80–120px padding (tighter than editorial)
- Left-aligned primarily; center-aligned for hero taglines only
- Monospace elements framed in a subtle border box (1px `#30363D`)
- Data and numbers use `font-variant-numeric: tabular-nums`
- Scanline overlay at 3% opacity on backgrounds (CRT feel)

## Depth & Motion
- Text glow: `text-shadow: 0 0 20px currentColor, 0 0 60px currentColor` on headlines
- Subtle 1px border on cards and code blocks
- No box-shadows (tech = flat, data-driven)
- Background stays solid `#0D1117`; accent glow is the only visual "depth"

## Do's and Don'ts
- **DO** use green accent (`#3FB950`) for success/positive indicators
- **DO** use monospace for all numbers and data display
- **DO** keep compositions dense — information density is the feature
- **DON'T** use rounded corners > 4px (tech is angular)
- **DON'T** use serif fonts anywhere
- **DON'T** add decorative elements — every pixel serves content
- **DON'T** use soft/blur transitions (wrong energy for tech)
- **DON'T** animate with `ease: "none"` on text (reads as broken, not deliberate)

## Anti-Slop Checklist
- [ ] Dark canvas (`#0D1117`) confirmed
- [ ] Monospace display used for headlines
- [ ] No rounded corners > 4px
- [ ] Grid dissolve or glitch transition between scenes
- [ ] Glow text-shadow on primary headlines
- [ ] Font sizes ≥ 18px (code/body), ≥ 60px (headlines)
- [ ] No serif fonts, no soft blurs, no decorative gradients
