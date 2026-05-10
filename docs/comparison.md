# Positioning: How Code2MP4 differs

Code2MP4 occupies a unique position in the video production landscape. This document explains how it relates to — and differs from — existing tools.

## Code2MP4 vs black-box text-to-video (Sora, Veo, Kling, Runway)

| | Black-box text-to-video | Code2MP4 |
|---|---|---|
| **Input** | Natural language prompt | Prompt + structured storyboard |
| **Output** | Opaque MP4 file | Editable motion source + deterministic MP4 |
| **Editability** | None — re-prompt from scratch | Full — modify storyboard or motion source |
| **Determinism** | Non-deterministic | Deterministic (same source = same output) |
| **Review** | Watch the video, guess what went wrong | Read the source, see the diff |
| **Version control** | Not meaningful | Git-trackable source files |
| **Use case** | Cinematic generation, creative exploration | Structured production, documentation, CI/CD |

Black-box tools excel at creative ideation and photorealism. Code2MP4 isn't competing there. It's for teams that need structured, repeatable, reviewable video production.

---

## Code2MP4 vs traditional video editors (Premiere, DaVinci, CapCut)

| | Traditional editors | Code2MP4 |
|---|---|---|
| **Interface** | GUI timeline | Agent-driven prompts + structured source |
| **Skill required** | Video editing expertise | Prompting + agent workflow |
| **Automation** | Manual operations, macros | Fully agent-driven pipeline |
| **Batch production** | Manual per-video | CI/CD capable |
| **Audience** | Video editors, designers | Developers, teams, agents |

Traditional editors give human creators full control. Code2MP4 gives agents and developers control at the source level — not by replacing editors, but by providing a production layer where none existed.

---

## Code2MP4 vs Remotion

[Remotion](https://remotion.dev) is a React-based framework for programmatic video creation. It's the closest existing tool to Code2MP4's philosophy.

| | Remotion | Code2MP4 |
|---|---|---|
| **Core paradigm** | React components → video | Prompt → storyboard → motion source → video |
| **Source format** | React (JSX/TSX) | HTML/CSS/GSAP + JSON storyboard |
| **Who writes it** | Developers (React) | Agents (prompt-driven) |
| **Agent-native** | Possible but not designed for | Designed from ground up for agents |
| **Pipeline** | Single-pass render | Multi-stage (Director → Scene → Assembly → Render) |
| **Motion systems** | Custom | 5 curated, deterministic motion directions |

Remotion is a framework for developers writing video in React. Code2MP4 is a pipeline for agents producing video from prompts. They solve different problems at different levels of abstraction.

---

## Code2MP4 vs HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) is Code2MP4's render engine. Understanding the relationship is critical:

```
HyperFrames = render engine  (solves: HTML → MP4)
Code2MP4     = video pipeline (solves: prompt → storyboard → motion source → render → MP4)
```

| | HyperFrames | Code2MP4 |
|---|---|---|
| **What it does** | Renders HTML compositions to MP4 | Orchestrates agent-driven video production |
| **Where it operates** | Rendering layer (Puppeteer + FFmpeg) | Workflow layer (prompts + pipeline + render) |
| **Who writes the input** | Developers or agents | Agents (guided by prompt stack + skills) |
| **Key innovations** | data-attribute timeline, deterministic capture | Storyboard schema, motion systems, multi-agent pipeline |

Code2MP4 delegates all rendering to HyperFrames. It adds the layers that HyperFrames intentionally leaves out: prompt engineering, storyboard generation, scene planning, quality checking, and agent workflow management.

---

## Code2MP4 vs Open Design

[Open Design](https://github.com/nexu-io/open-design) pioneered the agent orchestration architecture that Code2MP4 adapts for video.

| | Open Design | Code2MP4 |
|---|---|---|
| **Output format** | Web pages, apps, components | Video — motion source + MP4 |
| **Design system** | DESIGN.md (web design tokens) | MOTION.md (animation palettes + easing + transitions) |
| **Primary skill format** | SKILL.md for web/app design | SKILL.md for video production |
| **Render engine** | N/A (output is code) | HyperFrames (output is video) |
| **Preview** | Browser iframe | `<hyperframes-player>` + `<video>` tag |

Code2MP4 inherits Open Design's prompt layering, agent detection, SSE streaming, and filesystem project model — then extends them with video-specific concepts: MOTION.md, storyboard schemas, multi-stage rendering, and deterministic MP4 output.

---

## Summary: Why Code2MP4 exists

Code2MP4 exists because there is no open-source tool that lets a coding agent say "make a product launch video" and produce structured, editable, repeatable output. Black-box tools give you an MP4. Editors require a human. Remotion requires a React developer. HyperFrames requires you to write the HTML yourself.

Code2MP4 fills the gap: the pipeline that takes structured intent (storyboard) and turns it into editable source and deterministic video — driven entirely by agents.
