# Campaign Workflow

A single video is a project. A **campaign** takes that project and produces every deliverable needed for launch: multiple aspect ratios, durations, covers, captions, and social copy — all from one source.

Code2MP4's campaign workflow defines how to go from one motion source to a complete release package.

## Why campaigns matter

Real video production never stops at one MP4. If you make a product launch video, you need:

- 16:9 landscape for your website hero
- 9:16 portrait for TikTok/Reels/Shorts
- 1:1 square for Instagram/LinkedIn
- 4:5 vertical for Instagram feed
- Silent version (auto-play on social)
- Captioned version (accessible, sound-off viewing)
- Cover/thumbnail image
- Social copy (tweet, LinkedIn post, Instagram caption)
- 15s, 30s, and 60s duration variants

Without a campaign workflow, you do all of this manually — or worse, you generate each variant as a separate video from scratch.

## The campaign pipeline

```
brief.json
    ↓
script.json
    ↓
storyboard.json
    ↓
scene.json
    ↓
motion source (single source of truth)
    ↓
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ render.config │ render.config │ render.config │ render.config │
│ (16:9, 30s)   │ (9:16, 15s)   │ (1:1, 15s)    │ (4:5, 15s)    │
└───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┘
        ↓               ↓               ↓               ↓
   output-16x9.mp4  output-9x16.mp4  output-1x1.mp4  output-4x5.mp4
        ↓               ↓               ↓               ↓
   quality check    quality check    quality check    quality check
        ↓               ↓               ↓               ↓
┌───────────────────────────────────────────────────────────────┐
│                    Campaign Package                           │
│  - videos/          (all MP4 variants)                        │
│  - covers/          (thumbnail images per platform)            │
│  - copy/            (social media copy per platform)           │
│  - captions/        (SRT files per variant)                    │
│  - package.json     (campaign manifest)                        │
└───────────────────────────────────────────────────────────────┘
```

## Campaign manifest (`package.json`)

```jsonc
{
  "campaign": {
    "id": "widgetx-v2-launch",
    "title": "WidgetX v2 Launch Campaign",
    "briefId": "widgetx-v2-launch",
    "variants": [
      {
        "id": "landscape-30s",
        "aspect": "16:9",
        "duration": 30,
        "file": "videos/output-16x9-30s.mp4",
        "platforms": ["website", "youtube", "github"],
        "captions": "captions/landscape-30s.srt"
      },
      {
        "id": "portrait-15s",
        "aspect": "9:16",
        "duration": 15,
        "file": "videos/output-9x16-15s.mp4",
        "platforms": ["tiktok", "reels", "shorts"],
        "captions": "captions/portrait-15s.srt"
      },
      {
        "id": "square-15s",
        "aspect": "1:1",
        "duration": 15,
        "file": "videos/output-1x1-15s.mp4",
        "platforms": ["instagram", "linkedin", "twitter"],
        "captions": "captions/square-15s.srt"
      }
    ],
    "covers": [
      { "platform": "youtube", "file": "covers/youtube-thumb.jpg", "aspect": "16:9" },
      { "platform": "instagram", "file": "covers/instagram-cover.jpg", "aspect": "1:1" },
      { "platform": "github", "file": "covers/github-preview.gif", "aspect": "16:9" }
    ],
    "copy": [
      { "platform": "twitter", "file": "copy/tweet.md" },
      { "platform": "linkedin", "file": "copy/linkedin-post.md" },
      { "platform": "github", "file": "copy/release-notes.md" }
    ]
  }
}
```

## Variant strategy

### By aspect ratio

Different platforms require different shapes. The same motion source should produce all of them:

| Aspect | Resolution | Platform | Notes |
|---|---|---|---|
| 16:9 | 1920×1080 | Website, YouTube, GitHub | Default landscape |
| 9:16 | 1080×1920 | TikTok, Reels, Shorts | Most constraining — text must fit narrow width |
| 1:1 | 1080×1080 | Instagram feed, LinkedIn, Twitter | Square crops require center-focused layouts |
| 4:5 | 1080×1350 | Instagram feed (tall) | Slightly taller than square |

The motion source must be designed with the most constraining variant (9:16) in mind. If text fits 9:16 safely, it fits everything else.

### By duration

| Duration | Use case |
|---|---|
| 15s | Social short — hook, one feature, CTA |
| 30s | Standard — hook, problem, 3 features, CTA |
| 60s | Extended — full narrative arc with detail |
| 5s | Preview/GIF — single hook moment |

Duration variants work by selectively enabling/disabling scenes based on the storyboard. The 15s version might use scenes 1, 2, and 6. The 60s version uses all scenes with longer dwell times.

### By audio

| Audio mode | Use case |
|---|---|
| Full | Voiceover + music + SFX |
| Music only | Background music, no voiceover |
| Silent | No audio (auto-play safe on social) |
| Captioned | Silent + burned-in closed captions |

## CLI (planned)

```bash
# Generate all platform variants from one motion source
code2mp4 variants ./projects/widgetx-v2 --all

# Generate a specific variant
code2mp4 variants ./projects/widgetx-v2 --aspect 9:16 --duration 15

# Build the full campaign package
code2mp4 package ./projects/widgetx-v2

# Output:
#   videos/  (all MP4 variants)
#   covers/  (thumbnails)
#   copy/    (social media text)
#   package.json (campaign manifest)
```

## Integration with CI/CD

```yaml
# .github/workflows/release-video.yml
name: Release Video Campaign
on:
  release:
    types: [published]
jobs:
  campaign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate campaign
        run: |
          code2mp4 init --template release-notes --brief "${{ github.event.release.body }}"
          code2mp4 variants --all
          code2mp4 package
      - name: Upload to release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            campaign/videos/*.mp4
            campaign/covers/*.jpg
            campaign/copy/*.md
```

## Relationship to the production schemas

The campaign workflow sits at the **top of the pipeline** as the orchestration layer:

```
campaign (orchestrates)
  ├── brief.json        (one per campaign)
  ├── script.json       (one per campaign)
  ├── storyboard.json   (one per campaign)
  ├── motion source     (one source, many outputs)
  ├── render.config     (one per variant)
  ├── quality-report    (one per variant)
  └── package.json      (campaign manifest)
```

One campaign. One source of truth. Many outputs. No duplication.
