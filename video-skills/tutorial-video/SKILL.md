---
name: tutorial-video
description: |
  Tutorial / explainer video with step-by-step reveals, clear hierarchy,
  generous timing. Screen/layout clarity first. HyperFrames HTML → MP4.
triggers:
  - "tutorial"
  - "explainer"
  - "how-to"
  - "screencast"
  - "walkthrough"
  - "教程"
  - "讲解视频"
od:
  mode: video
  surface: video
  scenario: education
  preview:
    type: html
  design_system:
    requires: true
  example_prompt: |
    60-second tutorial: "How to deploy a Next.js app to Vercel in 3 steps."
    Clean dark UI, numbered steps, terminal snippets, clear hierarchy.
---

# Tutorial / Explainer Video

Produce a clear, instructional video using HyperFrames HTML.
Think like an educator: clarity beats flair. Every step is visible and labeled.

> **Skill root (absolute):** This skill's folder.

## Workflow

### 1. Outline the steps
Break the topic into 3-6 numbered steps. Each step = one scene.
- Step 1: Setup / context (what we're doing)
- Steps 2-N: Each action or concept
- Final step: Result / summary / next steps

### 2. Define the timing
Tutorial pacing is slower than promo. Budget:
- 5-8 seconds per step (generous)
- 0.5-0.8s transition between steps
- 2-3s intro, 2-3s outro

### 3. Scaffold
```bash
COMP=".hf-cache/tutorial-$(date +%s)"
npx hyperframes init "$COMP" --example blank --skip-skills --non-interactive
```

### 4. Scene template (per step)
```html
<div class="scene" data-scene="1">
  <div class="scene-content">
    <!-- Step number: top-left, mono, accent color -->
    <div class="step-num" data-start="0.2" data-duration="7"
         data-track-index="1" data-type="text"
         data-font-size="24" data-color="--accent">
      Step 1
    </div>
    <!-- Step title: left, large, display font -->
    <div class="step-title" data-start="0.5" data-duration="6"
         data-track-index="2" data-type="text"
         data-font-size="64" data-color="--fg">
      Install the CLI
    </div>
    <!-- Code/command block: left, mono, framed -->
    <div class="code-block" data-start="1.0" data-duration="6"
         data-track-index="3">
      <code>npm install -g vercel</code>
    </div>
    <!-- Tip / note: bottom, muted, small -->
    <div class="tip" data-start="2.0" data-duration="5"
         data-track-index="4" data-type="text"
         data-font-size="20" data-color="--muted">
      Requires Node.js 18+. Check with `node --version`.
    </div>
  </div>
</div>
```

### 5. Animation rules
- **Step number:** Simple fade in, no movement: `opacity: 0→1, duration: 0.3s`
- **Step title:** `y: 20→0, opacity: 0→1, duration: 0.5s, ease: power2.out`
- **Code block:** `clip-path: inset(0 0 100% 0 → 0 0 0% 0)`, `duration: 0.4s, ease: power2.out`
- **Tip/note:** `opacity: 0→1, duration: 0.4s`, enters AFTER the main content lands
- **Transitions:** Push right for step advancement (`x: 0→-60` out, `x: 60→0` in)

### 6. Code block styling
```css
.code-block {
  background: var(--surface, #1a1a2e);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  padding: 20px 28px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 22px;
  line-height: 1.6;
  color: var(--accent, #58a6ff);
  max-width: 800px;
}
```

## Anti-patterns (avoid)
- ❌ Text too small to read on mobile (min 18px, prefer 22px+)
- ❌ More than 2 lines of code per visual
- ❌ Steps that flash by faster than 3 seconds
- ❌ Complex animations that distract from content
- ❌ Missing step numbers — the viewer must always know where they are

## Output checklist
- [ ] 3-6 numbered steps, each its own scene
- [ ] Step number visible on every scene
- [ ] Minimum 4 seconds per step
- [ ] Code blocks use monospace, framed, readable size
- [ ] Transitions between every step
- [ ] lint + validate + inspect pass
