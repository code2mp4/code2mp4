# Release Notes Video Example

**Use case**: Automatically generate a short video from a CHANGELOG or release notes.

## What this example demonstrates

This example shows how to turn structured release content into a video. It demonstrates:

1. **CI/CD-ready workflow** — changelog → storyboard → video, fully automatable
2. **Version-focused layout** — prominent version number, feature highlight cards
3. **Familiar developer format** — mirrors the structure of a good changelog
4. **Repeatable per-release** — same template, new content every release

## Contents

```
release-notes/
  storyboard.json    — structured scene plan
  src/                — (generated) HyperFrames HTML fragments
  output/             — (generated) rendered MP4
  README.md           — this file
```

## Storyboard structure

| Scene | Duration | Goal |
|---|---|---|
| Version | 3s | Prominent version number with release date |
| New Features | 10s | Highlight what's new with feature cards |
| Improvements | 7s | Improvements and bug fixes summary |
| Upgrade | 5s | How to upgrade + link to full changelog |

## How to use this example

1. Update `storyboard.json` with your release's version, features, and improvements
2. Run the Code2MP4 pipeline with motion system "tech"
3. The video can be embedded in your release notes, social posts, or docs

## Integrating with CI/CD

```yaml
# .github/workflows/release-video.yml
on:
  release:
    types: [published]
jobs:
  generate-video:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate release notes video
        run: |
          # Extract release info from GitHub API
          # Update examples/release-notes/storyboard.json
          # Run code2mp4 render
          # Upload MP4 as release asset
```

## Expected output

- Storyboard: `storyboard.json` (this file)
- Motion source: `src/index.html` (HyperFrames composition)
- Rendered video: `output/output.mp4` (1920×1080, 30fps)
