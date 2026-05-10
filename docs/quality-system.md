# Quality System

Code2MP4's quality system — called **Video Review Theater** — is not just a checklist. It's the layer that transforms code2mp4 from a video *generator* into a video *production system*.

## Why a quality system matters

AI-generated video fails in predictable patterns:

1. **Weak hooks** — the first 3 seconds say nothing specific
2. **AI template smell** — generic phrasing ("In today's world...", "Revolutionary...")
3. **Text overload** — too many words, unreadable at video speed
4. **Platform mismatch** — wrong aspect ratio, unsafe zones, too long
5. **Dead pacing** — no rhythm variation, no peak-valley structure
6. **No exit strategy** — the video ends without telling you what to do

A generator alone can't catch these. It doesn't know they're problems. A quality system can.

## Architecture

The quality system runs as a **review agent** in the pipeline, after assembly and before render:

```
Assembly → Quality Review → [pass] → Render
                           → [fail] → Fix → Re-review
```

### Review dimensions

| Dimension | What it evaluates | How |
|---|---|---|
| **Hook** | First 3 seconds grab attention? | Text analysis + timing check |
| **Script** | Narrative arc valid? AI phrases? | Pattern matching + structure check |
| **Readability** | Text fits screen? Fonts large enough? | Character count + safe zone check |
| **Motion** | Animations varied? No stuck screens? | GSAP timeline analysis + inspect |
| **Platform** | Aspect ratio correct? Duration appropriate? | Brief vs output comparison |
| **Brand** | Colors match? Fonts correct? Logo present? | Motion system token verification |
| **Render** | Deterministic? Lint passes? No overflows? | `hyperframes lint` + `hyperframes inspect` |

### The anti-AI-template detector

One of the highest-signal checks in the system. Flags phrases that scream "AI wrote this":

```
In today's fast-paced world...
Revolutionary / groundbreaking / game-changing
Leveraging cutting-edge technology
Seamlessly integrated solution
We all know that...
Studies show that... (without citation)
In an era of...
Unprecedented...
Synergistic...
```

When detected, the review agent suggests a concrete, specific replacement — not just "remove this," but "replace with: 'Deploying takes 4 hours. We made it 60 seconds.'"

## Review output

Every review produces a `quality-report.json`:

```json
{
  "videoId": "widgetx-v2-launch",
  "passed": false,
  "dimensions": {
    "hook": {
      "passed": false,
      "checks": [
        { "id": "hook-visual-impact", "label": "First frame has visible content", "passed": false, "detail": "Blank fade-in for 0.5s" }
      ]
    }
  },
  "errors": [
    {
      "check": "hook-visual-impact",
      "severity": "error",
      "message": "First frame is a blank fade-in. No text or motion visible for 0.5s.",
      "fix": "Start headline entrance at time 0.0, not 0.5. Move tl.from('#headline', ...) to position 0."
    }
  ],
  "scores": { "overall": 72, "hook": 40, "engagement": 82, "clarity": 85, "platformFit": 78, "brandConsistency": 90 }
}
```

Key design decisions:
- **Errors block render** (hook missing, text overflow, lint failure)
- **Warnings are advisory** (pace could be tighter, transition variety low)
- **Every error includes a fix** — the review doesn't just say "bad," it says "here's how to make it good"

## Platform-aware review

Different platforms have different requirements. The quality system adapts:

| Platform | Duration | Aspect | Silent-safe | Safe zone |
|---|---|---|---|---|
| YouTube | 30-180s | 16:9 | No | 80px |
| TikTok/Reels | 15-60s | 9:16 | Yes | 120px (UI overlay) |
| GitHub README | 15-60s | 16:9 | Yes | 80px |
| Website hero | 30-90s | 16:9 | Yes | 120px |
| Twitter/X | 15-120s | 16:9 or 1:1 | Yes | 80px |
| Instagram | 15-90s | 1:1 or 4:5 | Yes | 100px |
| LinkedIn | 15-600s | 16:9 or 1:1 | Yes | 80px |

The review checks platform-specific requirements from the brief's `distribution.platforms` and `constraints`.

## Integration with the pipeline

### CLI (planned)

```bash
code2mp4 check ./projects/widgetx-v2
# → quality-report.json

code2mp4 review ./projects/widgetx-v2
# → quality-report.json + suggested fixes applied

code2mp4 fix ./projects/widgetx-v2
# → apply all suggested fixes, re-check
```

### CI/CD

```yaml
- name: Video quality check
  run: code2mp4 check ./projects/release-video
- name: Block release on quality failure
  if: failure()
  run: exit 1
```

## Philosophy

The quality system is built on a simple belief: **AI should not just generate video. It should be able to tell you when the video is bad.**

A tool that always says "yes" is a toy. A tool that sometimes says "no — and here's why, and here's how to fix it" is a production system.

That's the difference between a video generator and a video quality system. Code2MP4 aims to be both.
