# Space / Orbital — Motion System
> Category: Aerospace & Cinematic
> Surface: video
> Energy: dramatic / monumental

## Visual Atmosphere
Pure black canvas, spectral near-white text, full-bleed imagery. Uppercase typography,
ghost UI elements, positive letter-spacing. Think: SpaceX mission control, NASA documentary
titles, aerospace engineering films. Interface disappears — only content and space remain.
Radical minimalism: zero shadows, zero cards, zero containers.

## Color Palette
- **Canvas (background):** `#000000` — pure black, deep space
- **Primary accent:** `#F0F0FA` — spectral white, slight blue-violet tint (never pure white)
- **Secondary accent:** `#B8C4D8` — cool steel, for metadata and secondary text
- **Surface / card background:** `#0A0A0F` — barely-elevated, ghost panel (used only for data overlays)
- **Muted / subtle:** `#6B7280` — mid-grey, for timestamps and fine print
- **Border / rule:** `rgba(240,240,250,0.15)` — ghost border, barely visible
- **Text foreground:** `#F0F0FA` — spectral white
- **Warning / emphasis:** `#FF6B35` — warm orange, used only once per video (SOP 1: emergency/launch indicator)

## Typography
- **Display font:** D-DIN, Barlow Semi Condensed, Rajdhani, sans-serif
  - Size: 80–160px for headlines, 48–64px for subheads
  - Weight: 700 (Bold) for primary, 500 for secondary
  - Letter-spacing: 0.96px–1.17px positive tracking
  - Text-transform: uppercase for ALL headlines and subheads
  - Line-height: 0.95 (compressed, aerospace labeling)
- **Body font:** Barlow, Inter, system-ui, sans-serif
  - Size: 20–28px
  - Weight: 300 (Light) — thin, spectral, unassuming
  - Letter-spacing: 0.04em
  - Line-height: 1.6
  - Text-transform: none (body stays readable)
- **Data / telemetry font:** D-DIN, monospace fallback
  - Size: 16–24px
  - Weight: 400
  - Used for: timestamps, coordinates, mission parameters, launch data
  - Text-transform: uppercase

## Easing Signatures
- **Entrance (headlines):** `power4.out` — slow atmospheric build, massive deceleration
- **Entrance (telemetry / data):** `power2.out` — clean, measured reveal
- **Emphasis (hero moment):** `expo.out` — "we have liftoff" — long tail
- **Exit:** `power3.in` — rapid departure, like a spacecraft leaving frame
- **Drift / float:** `sine.inOut` — orbital drift, very slow (4–8s cycles)
- **Parallax reveal:** `power2.out` — foreground text locks while background drifts

## Transition Matrix
- **Default (scene→scene):** Gravitational zoom-through — `duration: 0.5s, ease: power3.inOut`
  - Incoming scene scales from 1.4 to 1.0 while outgoing fades to black
- **Content change:** Crossfade to black — `duration: 0.6s, ease: power2.inOut`
  - Fade to full black (0.3s hold), then fade in new content (0.3s)
- **Emphasis beat:** Flash to white — `duration: 0.1s, ease: none`
  - Single frame of spectral white (`#F0F0FA`) between key moments
- **Data update:** Type dissolve — `duration: 0.2s, ease: power2.out`
  - Old data fades out, new data fades in at same position

## Typography Animation Rules
- **Headline entrance:** `opacity: 0→1, y: 30→0, duration: 0.8s, ease: power4.out`
- **Spectral reveal:** `opacity: 0→0.9` (never 1.0 — slight transparency reads as "glass" on space), `duration: 0.6s, ease: power2.out`
- **Telemetry reveal:** `opacity: 0→1, x: -10→0`, per-line stagger: 0.15s, `duration: 0.4s, ease: power2.out`
- **Countdown / launch sequence:** `scale: 0.95→1.0, opacity: 0→1, duration: 0.4s, ease: power4.out`
- **Parallax text** (hero only): text layer stays fixed at center, background star-field drifts at 2px/s
- **Never use:** `scale` > 1.0 on text (distorts the precision feel); `ease: "none"` (too harsh for orbital aesthetic)

## Timing & Rhythm
- **Opening scene:** 3.0–5.0s — slow, atmospheric build (space is patient)
- **Content scene:** 3.0–6.0s — longer holds, less information per scene
- **Closing scene:** 3.0–4.0s — CTA in uppercase, ghost button, orbital drift
- **Transition gap:** 0.4–0.6s (slower than other systems — space is vast)
- **Minimum element hold:** 2.0s after entrance (monumental = unhurried)
- **Stagger between entrances:** 0.15–0.25s (deliberate pacing)

## Layout Principles
- 120–180px padding (generous — space needs breathing room)
- Center-aligned primarily — orbital symmetry
- Photography or gradient backgrounds fill 100% of canvas — no visible containers
- Ghost UI elements (buttons, borders) at `rgba(240,240,250,0.1)` — barely there
- Only ONE ghost button per scene (if any) — at `rgba(240,240,250,0.08)` background, 32px radius
- Text sits directly on the background — no cards, no panels, no visible chrome
- Subtle star-field or particle drift on backgrounds (opacity: 0.03, CSS animation)
- Launch telemetry HUD in bottom-left corner (optional, for technical content)

## Depth & Motion
- All depth from photography and atmospheric gradients — never from shadows
- Background: `radial-gradient(ellipse at 30% 40%, #0D0D1A 0%, #000000 80%)` — gentle light source
- Text: no shadows, no glow (spectral white reads purely on black)
- Ghost button: `rgba(240,240,250,0.08)` background, `rgba(240,240,250,0.25)` border, 32px radius
- Parallax: background star-field moves at 0.3x speed of foreground text
- No `box-shadow`, no `text-shadow`, no `backdrop-filter` — purity of space

## Do's and Don'ts
- **DO** use uppercase for ALL headlines and subheads (aerospace standard)
- **DO** use positive letter-spacing (0.96–1.17px) on all display text
- **DO** keep the interface invisible — viewers should see content, not chrome
- **DO** hold scenes longer than other systems (space is patient, monumental)
- **DO** use spectral white (`#F0F0FA`), never pure white (`#FFFFFF`)
- **DON'T** use shadows of any kind (box-shadow or text-shadow)
- **DON'T** use cards, containers, or visible panels
- **DON'T** use more than one ghost button per scene
- **DON'T** use color — only spectral white, cool steel, and the optional orange SOP indicator
- **DON'T** use rounded corners < 16px (ghost buttons need generous radii to feel intentional)

## Anti-Slop Checklist
- [ ] Pure black canvas (`#000000`) confirmed, with radial gradient depth
- [ ] D-DIN / Barlow Semi Condensed used for ALL display text
- [ ] Uppercase + positive letter-spacing on every headline and subhead
- [ ] Zero shadows anywhere (`box-shadow` and `text-shadow` both absent)
- [ ] Zero visible cards or containers
- [ ] Spectral white (`#F0F0FA`), never pure white
- [ ] Gravitational zoom-through or crossfade-to-black transitions only
- [ ] Font sizes ≥ 16px (telemetry), ≥ 48px (headlines)
- [ ] No serif fonts, no glow effects, no color beyond accent
- [ ] [Optional] Star-field parallax background at 0.03 opacity
