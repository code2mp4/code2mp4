# Release Notes Template

Turn a CHANGELOG or GitHub Release into a release notes video. Version → Features → Improvements → Upgrade.

## Quick start

```bash
code2mp4 create --template release-notes --name "v2.4.0-release"
```

## CI/CD integration

```yaml
# .github/workflows/release-video.yml
on:
  release:
    types: [published]
jobs:
  video:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          code2mp4 create --template release-notes --name "release-${{ github.ref_name }}"
          code2mp4 render --project "release-${{ github.ref_name }}"
      - uses: softprops/action-gh-release@v2
        with:
          files: projects/release-*/output.mp4
```

## What you provide

- Version number and release date
- New features (3 max for video, full list in description)
- Improvements and fixes
- Upgrade command
- Full changelog URL

## Scene structure

| Scene | Duration | Type | Default content |
|---|---|---|---|
| 1. Version | 3s | hook | "{{version}}" with release date |
| 2. Features | 10s | detail | Feature cards with descriptions |
| 3. Improvements | 7s | detail | Checklist of improvements |
| 4. Upgrade | 5s | cta | "{{upgrade-command}}" + full changelog link |

## Related
- Example: [examples/release-notes/](../../examples/release-notes/)
- Skill: [video-skills/code2mp4-director/](../../video-skills/code2mp4-director/)
- Skill: [video-skills/code2mp4-reviewer/](../../video-skills/code2mp4-reviewer/)
- Motion systems: tech (default), editorial, cinematic
