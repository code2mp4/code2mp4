# Music Library

Royalty-free music tracks for HyperFrames compositions.
Embed as `<audio>` elements with `data-start`, `data-duration`, `data-volume`.

## Tracks

- id: "ambient-calm"
  title: "Evening Melodrama"
  file: "ambient-calm.wav"
  style: ambient
  mood: calm
  bpm: 70
  duration_sec: 60
  license: CC-BY-3.0
  attribution: "Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 3.0"
  tags: [ambient, calm, piano, strings, emotional]

- id: "cinematic-epic"
  title: "Five Armies"
  file: "cinematic-epic.wav"
  style: cinematic
  mood: dramatic
  bpm: 120
  duration_sec: 60
  license: CC-BY-3.0
  attribution: "Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 3.0"
  tags: [cinematic, epic, orchestral, dramatic, tension]

- id: "corporate-upbeat"
  title: "Carefree"
  file: "corporate-upbeat.wav"
  style: corporate
  mood: energetic
  bpm: 140
  duration_sec: 60
  license: CC-BY-3.0
  attribution: "Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 3.0"
  tags: [corporate, upbeat, energetic, cheerful, positive]

## Sources

Music by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 3.0
http://creativecommons.org/licenses/by/3.0/

## How to add more

1. Download royalty-free MP3/WAV
2. Convert with: ffmpeg -i track.mp3 -t 60 -ar 48000 -ac 1 -sample_fmt s16 music/track-name.wav
3. Add entry above
