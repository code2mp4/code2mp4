---
name: product-launch-video
description: |
  Product launch / promo video in HyperFrames HTML. Product cinematography —
  hero shot, feature highlights, spec grid, CTA lockup. Single or multi-scene
  with polished transitions. Renders to MP4.
triggers:
  - "product video"
  - "promo video"
  - "product launch"
  - "product reveal"
  - "marketing video"
  - "产品视频"
  - "发布视频"
od:
  mode: video
  surface: video
  scenario: marketing
  preview:
    type: html
  design_system:
    requires: true
  example_prompt: |
    15-second product launch for a minimalist ceramic mug. Hero shot with
    warm side light, slow camera push-in, feature callouts, CTA at the end.
---

# Product Launch Video

Produce a polished product launch / promo video using HyperFrames HTML.
Think like a product cinematographer: hero product shot, controlled lighting,
feature highlights, and a clear call to action.

> **Skill root (absolute):** This skill's folder. When the workflow references
> relative paths like `assets/template.html`, resolve them against this root.

## Workflow

### 1. Understand the product
- What is the product? Key features? Differentiators?
- Visual assets available? (product shots, screenshots, logos)
- Brand colors, fonts, design system?
- Expected duration and aspect ratio?
- Call to action?

### 2. Draft storyboard
Plan 3-5 scenes:
1. **Hero** (2-4s) — Product reveal, brand name, one-line tagline
2. **Feature 1** (3-4s) — Key feature with visual support
3. **Feature 2** (3-4s) — Second feature or benefit
4. **Proof/Social** (3-4s) — Spec grid, testimonial, or numbers
5. **CTA** (2-3s) — Logo lockup + call to action

### 3. Scaffold composition
```bash
COMP=".hf-cache/launch-$(date +%s)"
npx hyperframes init "$COMP" --example blank --skip-skills --non-interactive
```

### 4. Build scenes (Layout Before Animation)
For each scene, position all elements at their most visible moment with CSS first.
Then add GSAP entrance animations.

### 5. Scene transition pattern
```js
// Scene N → Scene N+1
tl.to(stageZoom, { x: -40, opacity: 0, duration: 0.4, ease: "power2.inOut" }, sceneEnd);
tl.call(() => switchScene(N, N+1), [], sceneEnd + 0.2);
tl.to(stageZoom, { x: 0, opacity: 1, duration: 0.4, ease: "power2.inOut" }, sceneEnd + 0.2);
```

### 6. Verify and render
```bash
npx hyperframes lint && npx hyperframes validate && npx hyperframes inspect
# Fix all errors, then dispatch render
```

## Scene templates

### Hero scene
- Product image/video centered or slightly off-center
- Brand/logo top-left or top-center
- Headline: large (80-120px), display font
- Subhead: medium (36-48px), body font
- Optional: subtle gradient vignette behind product

### Feature scene
- Feature name: medium-large (48-64px), accent color
- Feature description: body size (24-32px)
- Supporting visual: screenshot, icon, or diagram
- Layout: visual left + text right, or text center + visual below

### Spec grid scene
- 3-4 spec items in a grid
- Each card: spec value (large, monospace) + label (small, muted)
- Cards enter with stagger: 0.12s between cards

### CTA scene
- Logo centered
- One-line CTA: "Available now" / "Try it free" / "Learn more at..."
- Website URL in mono font below
- Optional: subtle scale pulse on CTA text

## Animation rules
- Headlines enter from below: `y: 60→0, opacity: 0→1, duration: 0.7s, ease: power3.out`
- Product images enter: `scale: 0.92→1, opacity: 0→1, duration: 0.8s, ease: power2.out`
- Feature cards enter staggered: `y: 30→0, opacity: 0→1, duration: 0.5s, ease: back.out(1.1)`
- Spec numbers count up: `opacity: 0→1, duration: 0.8s, ease: power2.out`
- Never animate text with scale (causes render blur)

## Output checklist
- [ ] All 3-5 scenes present with content
- [ ] Transitions between every scene pair
- [ ] Product name visible in hero and CTA scenes
- [ ] Palette matches active MOTION.md or brand spec
- [ ] lint + validate + inspect all pass
- [ ] Rendered MP4 plays correctly at target duration
