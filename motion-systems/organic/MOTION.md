# Nature / Organic — Motion System
> Category: Lifestyle & Wellness
> Surface: video
> Energy: calm / serene

## Visual Atmosphere
Warm earth canvas, forest green + harvest gold accents. Organic curves, generous breathing room,
soft light leaks. Think: wellness brand reels, sustainable product launches, nature documentary
titles, meditation app promos. Nothing moves fast — everything breathes.

## Color Palette
- **Canvas (background):** `#F4F1EA` — warm eggshell, unbleached paper
- **Primary accent:** `#4A7C59` — forest green, grounded and calming
- **Secondary accent:** `#D4A853` — harvest gold, warmth and optimism
- **Surface / card background:** `#FFFFFF` — clean, organic contrast
- **Muted / subtle:** `#8B8B7A` — sage grey, for body text
- **Border / rule:** `#D4CFC4` — warm stone, 1px
- **Text foreground:** `#2C2C1E` — warm dark brown (never pure black — too harsh)
- **Soft highlight:** `#F0E68C` — pale gold, used for subtle emphasis glows

## Typography
- **Display font:** Lora, Cormorant Garamond, Source Serif, serif
  - Size: 72–110px for headlines, 38–52px for subheads
  - Weight: 600 (SemiBold) for primary, 400 for secondary
  - Letter-spacing: -0.01em (gentle, organic compression)
  - Line-height: 1.12
  - Font-style: italic on accent words (single word emphasis, not full lines)
- **Body font:** Source Serif 4, Lora, Georgia, serif
  - Size: 20–30px
  - Weight: 400
  - Letter-spacing: 0.005em
  - Line-height: 1.6 (generous — organic = readable)
- **Caption / label font:** Inter, system-ui, sans-serif (for contrast with serif body)
  - Size: 14–20px
  - Weight: 500
  - Used for: small labels, ingredient lists, botanical names

## Easing Signatures
- **Entrance (headlines):** `power2.out` — gentle drift into position
- **Entrance (body / elements):** `sine.inOut` — soft, organic swell
- **Emphasis (gold accent):** `sine.inOut` — gentle light pulse, 2–3s cycle
- **Exit:** `power1.in` — quiet fade, no drama
- **Leaf / float:** `sine.inOut` — very slow drift, 3–6s cycles (like a leaf falling)
- **Bloom / unfurl:** `power3.out` — slow reveal, like a flower opening

## Transition Matrix
- **Default (scene→scene):** Light leak — `duration: 0.6s, ease: sine.inOut`
  - Warm golden light washes across screen as outgoing fades
- **Topic change:** Soft blur crossfade — `duration: 0.5s, ease: power2.inOut`
  - Outgoing blurs (filter: blur(4px)) while incoming sharpens into focus
- **Emphasis beat:** Golden glow pulse — `duration: 0.8s, ease: sine.inOut`
  - Canvas brightens slightly with warm gold overlay, then settles
- **Detail reveal:** Gentle wipe — `duration: 0.5s, ease: power2.out`
  - Diagonal wipe from bottom-left to top-right, 45°, gold border leading edge

## Typography Animation Rules
- **Headline entrance:** `opacity: 0→1, y: 20→0, duration: 0.7s, ease: power2.out`
- **Italic emphasis:** `font-style: normal→italic, opacity: 0.6→1.0`, `duration: 0.3s, ease: sine.inOut`, applied to single word
- **Body text reveal:** `opacity: 0→1, y: 12→0`, per-paragraph stagger: 0.2s, `duration: 0.5s, ease: power2.out`
- **Gold highlight reveal:** `text-decoration: underline`, `text-decoration-color: #D4A853→transparent`, underline sweeps left-to-right, `duration: 0.6s, ease: power2.out`
- **Botanical label (scientific name):** `opacity: 0→1, x: -6→0`, `duration: 0.4s, ease: power2.out`, rendered in Inter at 14-16px
- **Never use:** `scale` on serif text (stretches the delicate serifs); `power4` easing (too aggressive); any animation faster than 0.3s

## Timing & Rhythm
- **Opening scene:** 3.0–5.0s — slow, atmospheric establishment (nature doesn't rush)
- **Content scene:** 3.5–6.0s — generous holds, one idea per scene
- **Closing scene:** 4.0–6.0s — calm CTA, organic dissolve to logo
- **Transition gap:** 0.5–0.8s (slowest of all systems — organic = unhurried)
- **Minimum element hold:** 2.5s after entrance
- **Stagger between entrances:** 0.2–0.35s (deliberate, breath-like pacing)

## Layout Principles
- 120–180px padding (generous — nature needs room)
- Center-aligned for headlines; left-aligned for body text (natural reading flow)
- Organic curves: `border-radius: 12–16px` on cards, `border-radius: 50%` on accent circles
- Photography or botanical illustrations as subtle background layers (opacity: 0.08)
- Light leak overlays: `radial-gradient(ellipse at 70% 30%, rgba(212,168,83,0.08) 0%, transparent 70%)`
- Subtle paper texture overlay at 3% opacity (CSS noise or static PNG)
- Gold leaf thin lines (1px `#D4A853` at 30% opacity) as section dividers

## Depth & Motion
- Very subtle text shadow: `text-shadow: 0 1px 2px rgba(44,44,30,0.06)` — barely perceptible warmth
- Card elevation: no shadow, just a 1px `#D4CFC4` border on white surface
- Gold accents get `box-shadow: 0 2px 8px rgba(212,168,83,0.15)` — soft golden halo
- Light leaks: warm `radial-gradient` at low opacity, slowly drifting via CSS animation
- Background has subtle grain/texture (noise at 3% opacity)
- No heavy shadows — organic depth comes from color warmth, not simulation

## Do's and Don'ts
- **DO** use serif fonts throughout — this system is about warmth, not efficiency
- **DO** use italic on single words for emphasis (not full sentences)
- **DO** keep transitions slow and gentle (0.5–0.8s minimum)
- **DO** use the gold accent (`#D4A853`) sparingly — one golden element per scene max
- **DO** add subtle paper texture or grain to the background (3–5% opacity)
- **DON'T** use black text anywhere (`#2C2C1E` is the darkest allowed)
- **DON'T** use pure white backgrounds (canvas is `#F4F1EA`, cards use `#FFFFFF`)
- **DON'T** use geometric sans-serif for headlines (Lora / serif only)
- **DON'T** animate faster than `power2` easing level
- **DON'T** use hard cuts or glitch transitions (destroys the organic atmosphere)

## Anti-Slop Checklist
- [ ] Warm eggshell canvas (`#F4F1EA`) confirmed
- [ ] Lora / Cormorant / Source Serif used for ALL display and body text
- [ ] Forest green (`#4A7C59`) as primary accent, harvest gold (`#D4A853`) as secondary
- [ ] No pure black or pure white in any color slot
- [ ] Light leak or soft blur crossfade transitions only
- [ ] Slow pacing — no animation under 0.3s, transitions ≥ 0.5s
- [ ] Font sizes ≥ 14px (captions), ≥ 20px (body), ≥ 60px (headlines)
- [ ] No geometric sans-serif for headlines
- [ ] Gold accent used once per scene maximum
- [ ] [Optional] Paper texture / grain overlay at 3% opacity
