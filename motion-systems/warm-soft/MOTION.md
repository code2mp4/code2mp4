# Warm & Soft — Motion System
> Category: Lifestyle & Wellness
> Surface: video
> Energy: calm—medium

## Visual Atmosphere
Cream canvas, terracotta + sage accents. Generous squircle radii, soft light leaks,
spring easings. Think: wellness brand reels, D2C product launches, lifestyle content.

## Color Palette
- **Canvas (background):** `#FAF7F2` — warm cream
- **Primary accent:** `#D97757` — terracotta, warm and inviting
- **Secondary accent:** `#6B8F71` — muted sage green, for balance
- **Surface / card background:** `#FFFFFF` — with `border-radius: 16px`, subtle shadow
- **Muted / subtle:** `#C9C0B6`
- **Border / rule:** `#E8E2DA` — nearly invisible
- **Text foreground:** `#2D2420` — warm dark brown (not pure black)

## Typography
- **Display font:** Quicksand, Nunito, SF Pro Rounded, sans-serif
  - Size: 72–100px for headlines, 42–56px for subheads
  - Weight: 600 for primary, 400 for secondary
  - Letter-spacing: -0.01em
  - Line-height: 1.15
- **Body font:** Inter, SF Pro Text, system-ui, sans-serif
  - Size: 22–32px
  - Weight: 400
  - Letter-spacing: 0em
  - Line-height: 1.5

## Easing Signatures
- **Entrance (all elements):** `back.out(1.2)` — gentle overshoot, playful
- **Entrance (cards/images):** `power2.out` — smooth reveal
- **Emphasis:** `elastic.out(1, 0.4)` — springy, warm
- **Exit:** `power2.in` — soft, no rush
- **Hover/response animations:** `power1.out`, duration: 0.3s

## Transition Matrix
- **Default (scene→scene):** Light leak / soft wipe — `duration: 0.5s, ease: power2.out`
  - Warm orange/cream gradient sweep across screen
- **Section change:** Gentle blur + scale — `duration: 0.6s, ease: sine.inOut`
  - Outgoing: `filter: blur(0→6px) + scale(1→1.02) + opacity(1→0)`
  - Incoming: `filter: blur(6→0px) + scale(0.98→1) + opacity(0→1)`
- **Emphasis beat:** Slight scale pop — `duration: 0.3s, ease: back.out(1.4)`
  - Element: `scale(1→1.05→1)` with warm glow flash

## Typography Animation Rules
- **Headline entrance:** `y: 30→0, opacity: 0→1, duration: 0.6s, ease: back.out(1.2)`
- **Subhead entrance:** `y: 20→0, opacity: 0→1, duration: 0.5s, ease: back.out(1.1)`
- **Card reveal:** `y: 40→0, opacity: 0→1, duration: 0.5s, ease: power2.out`, stagger: 0.12s
- **Image/photo reveal:** `scale: 0.92→1, opacity: 0→1, duration: 0.7s, ease: power2.out`
- **Never use:** harsh `x` translations (lateral movement feels aggressive), `power4` or `circ` easings

## Timing & Rhythm
- **Opening scene:** 2.5–3.5s — gentle reveal, settle into mood
- **Content scene:** 3.0–5.0s — generous holds, rooms to breathe
- **Closing scene:** 2.0–3.0s — soft fade out, brand lockup
- **Transition gap:** 0.5s (included)
- **Minimum element hold:** 2.0s after entrance complete
- **Stagger between entrances:** 0.12–0.25s (generous spacing)

## Layout Principles
- Large padding: 100–160px on all sides
- Elements center-aligned or in a gentle grid
- Cards: 16px border-radius, subtle shadow (`0 2px 12px rgba(0,0,0,0.04)`)
- Round shapes preferred — circles, squircle image frames
- Organic arrangement preferred over strict grid

## Depth & Motion
- Subtle card shadows: `0 2px 12px rgba(0,0,0,0.04)`, `0 8px 24px rgba(0,0,0,0.06)`
- Soft text shadows on imagery: `0 2px 8px rgba(0,0,0,0.06)`
- Ambient motion: gentle drift on background elements (scale: 1→1.02 over 4s)
- No harsh lines; borders are `#E8E2DA`, nearly invisible

## Do's and Don'ts
- **DO** use rounded, organic shapes
- **DO** leave generous whitespace between elements
- **DO** use warm brown (`#2D2420`) for text, never pure black
- **DO** add subtle ambient motion to backgrounds
- **DON'T** use pure white canvas (too stark) — always the warm cream
- **DON'T** use aggressive easings (power4, circ, none)
- **DON'T** stack more than 2 elements entering simultaneously
- **DON'T** use sharp corners or angular layouts
- **DON'T** use green/blue/purple accents — terracotta + sage only

## Anti-Slop Checklist
- [ ] Cream canvas (`#FAF7F2`) confirmed
- [ ] Terracotta accent (`#D97757`) used ≤ 2 times
- [ ] Rounded shapes (≥ 12px radius)
- [ ] Soft transitions (light leak or blur, not hard cuts)
- [ ] No aggressive easings (power4, circ, none)
- [ ] Text color is warm brown, not pure black
- [ ] Font sizes ≥ 22px body, ≥ 64px headlines
- [ ] Ambient motion present on at least one element
