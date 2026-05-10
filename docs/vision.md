# Vision: Why agents need video as an output format

## The problem

Coding agents (Claude Code, OpenCode, Codex, Gemini CLI) can already produce text, code, websites, documents, presentations, and apps. But video — the dominant communication medium of the internet — remains largely inaccessible to them.

Today, if an agent needs to create a video, it has two bad options:

1. **Call a black-box text-to-video API** (Sora, Kling, Veo, Runway). The result is an opaque MP4 — uneditable, unreviewable, non-deterministic. If the agent made a mistake, it must re-generate from scratch.

2. **Generate code for a human editor** (After Effects, Premiere). This doesn't work — agents can't operate GUI tools, and the timeline format isn't designed for programmatic modification.

Neither option supports the core agent workflow: generate → inspect → edit → repeat.

## The thesis

**Agents should not only write text and code. Agents should also generate structured, editable, reproducible videos.**

Video is too important to be an opaque format. It should be:

- **Editable** — like a source file, not a rendered artifact
- **Reviewable** — like a code diff, not a black-box preview
- **Repeatable** — deterministic output from the same source
- **Version-controlled** — stored in Git alongside the project it documents

## What this enables

### 1. Video as documentation

Every open-source project has a README. Few have a 30-second intro video. With agent-native video production, generating one becomes as routine as writing docs:

```
Project README → Code2MP4 → Intro video MP4
```

### 2. Video as release artifact

Every release has a changelog. Now every release can have an automated video:

```
CHANGELOG.md → Code2MP4 → Release notes video
```

This is pure CI/CD: commit the changelog, an agent generates the storyboard, the pipeline renders the MP4, the release ships with both.

### 3. Video as marketing asset

SaaS products launch features constantly. Most go unannounced because video production is too expensive. Agent-native video changes this:

```
Feature brief → Code2MP4 → Product launch video
```

### 4. Video as editable design asset

When a team reviews a video draft, they should be able to say "move this text earlier" or "change the accent color" and have an agent apply the edit to the source file — not regenerate the entire video from scratch.

## The design principle

Code2MP4 is built on a single principle: **video source files are first-class development artifacts.**

They live in your repo. They're structured (JSON storyboard + HTML/CSS/GSAP motion source). They're deterministic (same source = same MP4 output). They're agent-editable (the same agent that wrote it can modify it).

This is what "agent-native" means. Not "an agent happened to produce this video." But "this video was designed from the ground up to be produced, reviewed, and maintained by agents."
