/**
 * Music library loader.
 *
 * Scans <projectRoot>/music/ for WAV/MP3 files and reads MUSIC.md
 * for metadata catalog. Each track can be embedded as an <audio>
 * element in HyperFrames compositions.
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface MusicTrack {
  id: string;
  title: string;
  file: string;
  style: string;
  mood: string;
  bpm: number;
  durationSec: number;
  license: string;
  attribution: string;
  tags: string[];
  /** Absolute file path */
  path: string;
  /** File size in bytes */
  size: number;
}

/**
 * Parse MUSIC.md YAML-ish catalog entries.
 */
function parseMusicCatalog(raw: string): Omit<MusicTrack, 'path' | 'size'>[] {
  const tracks: Omit<MusicTrack, 'path' | 'size'>[] = [];
  let current: Record<string, string | string[]> = {};

  for (const line of raw.split('\n')) {
    const entryMatch = line.match(/^-\s*id:\s*"(.+)"/);
    if (entryMatch) {
      if (current.id) {
        tracks.push(normalizeTrack(current));
      }
      current = { id: entryMatch[1] };
      continue;
    }

    const kv = line.match(/^\s{2}(\w+):\s*(.+)/);
    if (kv && current.id) {
      const key = kv[1];
      let value: string = kv[2].trim();
      value = value.replace(/^["']|["']$/g, '');

      if (key === 'tags') {
        // Parse YAML array: [tag1, tag2]
        const arrMatch = value.match(/^\[(.+)\]$/);
        current[key] = arrMatch
          ? arrMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          : [value];
      } else {
        current[key] = value;
      }
    }
  }

  if (current.id) {
    tracks.push(normalizeTrack(current));
  }

  return tracks;
}

function normalizeTrack(raw: Record<string, string | string[]>): Omit<MusicTrack, 'path' | 'size'> {
  return {
    id: String(raw.id || ''),
    title: String(raw.title || raw.id || ''),
    file: String(raw.file || ''),
    style: String(raw.style || 'ambient'),
    mood: String(raw.mood || 'neutral'),
    bpm: parseInt(String(raw.bpm || '120'), 10),
    durationSec: parseInt(String(raw.duration_sec || '60'), 10),
    license: String(raw.license || 'CC0'),
    attribution: String(raw.attribution || ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
  };
}

export async function listMusic(musicRoot: string): Promise<MusicTrack[]> {
  const catalogPath = path.join(musicRoot, 'MUSIC.md');
  let catalogEntries: Omit<MusicTrack, 'path' | 'size'>[] = [];

  try {
    const raw = await readFile(catalogPath, 'utf8');
    catalogEntries = parseMusicCatalog(raw);
  } catch {
    // No catalog — return empty
    return [];
  }

  const tracks: MusicTrack[] = [];
  for (const entry of catalogEntries) {
    const filePath = path.join(musicRoot, entry.file);
    try {
      const st = await stat(filePath);
      if (st.isFile()) {
        tracks.push({
          ...entry,
          path: filePath,
          size: st.size,
        });
      }
    } catch {
      // File doesn't exist — skip
    }
  }

  return tracks;
}

export async function readMusicFile(
  musicRoot: string,
  trackId: string,
): Promise<{ track: MusicTrack; buffer: Buffer } | null> {
  const tracks = await listMusic(musicRoot);
  const track = tracks.find(t => t.id === trackId);
  if (!track) return null;

  try {
    const buffer = await readFile(track.path);
    return { track, buffer };
  } catch {
    return null;
  }
}
