# Music Library

Each track is a royalty-free audio file. Add your own tracks under `music/`
and register them below. Tracks are embedded as `<audio>` elements in
HyperFrames compositions and mixed into the final MP4.

## Catalog format

```yaml
- id: "track-id"
  title: "Human Readable Title"
  file: "filename.wav"
  style: ambient | cinematic | corporate | electronic | minimal | orchestral | lo-fi
  mood: calm | energetic | dramatic | uplifting | dark | neutral
  bpm: 120
  duration_sec: 60
  license: CC0 | Pixabay | YouTube-Audio | custom
  attribution: "Artist Name — Source"
  tags: [tag1, tag2]
```

---

## Starter Tracks

- id: "ambient-tech"
  title: "Ambient Tech"
  file: "ambient-tech.wav"
  style: ambient
  mood: calm
  bpm: 80
  duration_sec: 60
  license: CC0
  attribution: "Open Video — generated"
  tags: [tech, ambient, calm, background, pad]

- id: "cinematic-drive"
  title: "Cinematic Drive"
  file: "cinematic-drive.wav"
  style: cinematic
  mood: dramatic
  bpm: 100
  duration_sec: 60
  license: CC0
  attribution: "Open Video — generated"
  tags: [cinematic, dramatic, epic, tension, build]

- id: "corporate-upbeat"
  title: "Corporate Upbeat"
  file: "corporate-upbeat.wav"
  style: corporate
  mood: energetic
  bpm: 120
  duration_sec: 60
  license: CC0
  attribution: "Open Video — generated"
  tags: [corporate, upbeat, energetic, product, launch]

---

## How to add real music

1. Download royalty-free tracks from:
   - https://pixabay.com/music/ (CC0, no attribution)
   - https://uppbeat.io/ (free with attribution)
   - https://www.youtube.com/audiolibrary/music (free, check license)

2. Convert to 16-bit 48kHz mono WAV:
   ```bash
   ffmpeg -i downloaded.mp3 -ar 48000 -ac 1 -sample_fmt s16 music/track-name.wav
   ```

3. Add an entry above with the track metadata.

4. Agent will auto-discover via `GET /api/music` and embed in compositions.
