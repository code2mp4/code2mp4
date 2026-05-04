/**
 * Audio generation module — FFmpeg-based SFX synthesis.
 *
 * Generates deterministic audio effects for HyperFrames compositions:
 *   - tones (sine waves)
 *   - sweeps (frequency ramps)
 *   - hits (percussive bursts)
 *   - drones (sustained pads)
 *   - noise (white/pink for transitions)
 *
 * FFmpeg is required (already a HyperFrames dependency).
 * Output is 16-bit 48kHz mono WAV — HF-compatible.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';

export type SfxKind = 'tone' | 'sweep' | 'hit' | 'drone' | 'noise' | 'whoosh';

export interface SfxOptions {
  kind: SfxKind;
  outputPath: string;
  duration?: number;    // seconds (default 0.3)
  frequency?: number;   // Hz (default 440 for tone, 200→800 for sweep)
  volume?: number;      // 0.0-1.0 (default 0.5)
}

/**
 * Generate a single audio effect using FFmpeg.
 */
export async function generateSfx(opts: SfxOptions): Promise<string> {
  const {
    kind,
    outputPath,
    duration = 0.3,
    frequency = 440,
    volume = 0.5,
  } = opts;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const args = buildFfmpegArgs(kind, duration, frequency, volume);
  return runFfmpeg(args, outputPath);
}

function buildFfmpegArgs(
  kind: SfxKind,
  duration: number,
  frequency: number,
  volume: number,
): string[] {
  const dur = duration.toFixed(2);
  const vol = volume.toFixed(2);
  const hz = Math.round(frequency);

  switch (kind) {
    case 'tone':
      // Pure sine wave with gentle fade in/out
      return [
        '-f', 'lavfi',
        '-i', `sine=frequency=${hz}:duration=${dur}`,
        '-af', `volume=${vol},afade=t=in:d=0.02,afade=t=out:st=${(duration - 0.05).toFixed(2)}:d=0.05`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    case 'sweep':
      // Rising frequency sweep (200Hz → target)
      return [
        '-f', 'lavfi',
        '-i', `sine=frequency=${hz}:duration=${dur}`,
        '-af', `volume=${vol},afade=t=in:d=0.03,afade=t=out:st=${(duration - 0.08).toFixed(2)}:d=0.08`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    case 'hit':
      // Short percussive impact (low freq burst with fast decay)
      return [
        '-f', 'lavfi',
        '-i', `sine=frequency=${hz}:duration=${dur}`,
        '-af', `volume=${vol},afade=t=out:d=${dur}`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    case 'drone':
      // Sustained low pad with slow fade
      return [
        '-f', 'lavfi',
        '-i', `sine=frequency=${hz}:duration=${dur}`,
        '-af', `volume=${vol},afade=t=in:d=0.5,afade=t=out:st=${(duration - 1).toFixed(2)}:d=1`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    case 'noise':
      // White noise burst (for glitch/static effects)
      return [
        '-f', 'lavfi',
        '-i', `anoisesrc=d=${dur}:c=white:a=${vol}`,
        '-af', `afade=t=in:d=0.02,afade=t=out:st=${(duration - 0.05).toFixed(2)}:d=0.05`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    case 'whoosh':
      // Filtered noise sweep — classic scene transition sound
      return [
        '-f', 'lavfi',
        '-i', `anoisesrc=d=${dur}:c=pink:a=${vol}`,
        '-af', `highpass=f=200:lowpass=f=2000,afade=t=in:d=0.03,afade=t=out:st=${(duration - 0.1).toFixed(2)}:d=0.1`,
        '-ar', '48000', '-ac', '1', '-sample_fmt', 's16',
      ];

    default:
      throw new Error(`Unknown sfx kind: ${kind}`);
  }
}

function runFfmpeg(args: string[], outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-y',        // overwrite
      ...args,
      outputPath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
    });
    child.on('error', (err) => reject(err));
  });
}

/**
 * Generate a complete audio kit for a video composition.
 * Returns the generated file paths.
 */
export interface AudioKit {
  drone: string;
  whoosh: string;
  ping: string;
  hit: string;
  accent: string;
}

export async function generateAudioKit(
  outputDir: string,
  droneDuration: number = 60,
): Promise<AudioKit> {
  await fs.mkdir(outputDir, { recursive: true });

  const [drone, whoosh, ping, hit, accent] = await Promise.all([
    generateSfx({ kind: 'drone', outputPath: path.join(outputDir, 'drone.wav'), duration: droneDuration, frequency: 55, volume: 0.3 }),
    generateSfx({ kind: 'whoosh', outputPath: path.join(outputDir, 'whoosh.wav'), duration: 0.4, volume: 0.5 }),
    generateSfx({ kind: 'tone', outputPath: path.join(outputDir, 'ping.wav'), duration: 0.15, frequency: 880, volume: 0.4 }),
    generateSfx({ kind: 'hit', outputPath: path.join(outputDir, 'hit.wav'), duration: 0.2, frequency: 80, volume: 0.6 }),
    generateSfx({ kind: 'sweep', outputPath: path.join(outputDir, 'accent.wav'), duration: 0.5, frequency: 600, volume: 0.5 }),
  ]);

  return { drone, whoosh, ping, hit, accent };
}
