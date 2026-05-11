/**
 * HyperFrames renderer bridge.
 *
 * Wraps the `hyperframes` CLI for lint, validate, inspect, and render
 * operations. The server spawns these as child processes and streams
 * progress back to the client via SSE.
 *
 * Design decisions:
 * - lint/validate/inspect are agent-side (run from agent's Bash tool)
 * - render is daemon-side (Puppeteer doesn't work under agent sandboxes)
 * - Progress from render is forwarded to agent via stderr
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

export interface LintResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface RenderOptions {
  outputPath: string;
  quality?: 'draft' | 'standard' | 'high';
  fps?: number;
}

export interface RenderProgress {
  type: 'progress';
  frame: number;
  totalFrames: number;
}

export interface RenderComplete {
  type: 'complete';
  outputPath: string;
  fileSize: number;
}

export type RenderEvent = RenderProgress | RenderComplete;

/**
 * Run hyperframes lint on a composition directory.
 * Used by the server to pre-validate before allowing render.
 */
export async function lintComposition(compositionDir: string): Promise<LintResult> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['hyperframes', 'lint', '--json'], {
      cwd: compositionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve({
            passed: true,
            errors: [],
            warnings: result.warnings ?? [],
          });
        } catch {
          resolve({ passed: true, errors: [], warnings: [] });
        }
      } else {
        resolve({
          passed: false,
          errors: stderr.split('\n').filter(Boolean),
          warnings: [],
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        errors: [`Failed to spawn hyperframes: ${err.message}`],
        warnings: [],
      });
    });
  });
}

/**
 * Run hyperframes validate on a composition directory.
 * Uses headless Chrome — this is Chrome-bound, should run daemon-side.
 */
export async function validateComposition(compositionDir: string): Promise<LintResult> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['hyperframes', 'validate', '--json'], {
      cwd: compositionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PUPPETEER_HEADLESS: 'true' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve({
            passed: true,
            errors: [],
            warnings: result.warnings ?? [],
          });
        } catch {
          resolve({ passed: true, errors: [], warnings: [] });
        }
      } else {
        resolve({
          passed: false,
          errors: stderr.split('\n').filter(Boolean),
          warnings: [],
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        errors: [`Failed to spawn hyperframes: ${err.message}`],
        warnings: [],
      });
    });
  });
}

/**
 * Run hyperframes inspect on a composition directory.
 * Visual layout audit — finds overflowing text, clipped elements, contrast issues.
 */
export async function inspectComposition(compositionDir: string): Promise<{
  passed: boolean;
  findings: Array<{ severity: string; selector: string; message: string; timestamp: number }>;
}> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['hyperframes', 'inspect', '--json'], {
      cwd: compositionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PUPPETEER_HEADLESS: 'true' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve({
          passed: code === 0 && (result.overflows?.length ?? 0) === 0,
          findings: result.overflows ?? result.findings ?? [],
        });
      } catch {
        resolve({
          passed: false,
          findings: [{ severity: 'error', selector: '', message: stderr || 'Inspect failed', timestamp: 0 }],
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        findings: [{ severity: 'error', selector: '', message: err.message, timestamp: 0 }],
      });
    });
  });
}

/**
 * Render a HyperFrames composition to MP4.
 *
 * This runs the FULL render pipeline (capture + encode + mux) via
 * `hyperframes render`. This is the heavy Chrome-bound operation that
 * MUST run on the daemon, not in an agent's sandboxed shell.
 *
 * Progress events are emitted via callback.
 */
export async function renderComposition(
  compositionDir: string,
  options: RenderOptions,
  onProgress?: (event: RenderEvent) => void,
): Promise<RenderComplete> {
  const args = [
    'hyperframes',
    'render',
    '--format', 'mp4',
    '--quality', options.quality ?? 'standard',
    '--fps', String(options.fps ?? 30),
    '--output', options.outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, {
      cwd: compositionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PUPPETEER_HEADLESS: 'true', HF_NO_TELEMETRY: '1' },
    });

    proc.stdout?.on('data', (d: Buffer) => {
      const lines = d.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        // Parse progress lines like "Capturing frame 45/360"
        const frameMatch = line.match(/frame\s+(\d+)\/(\d+)/i);
        if (frameMatch) {
          onProgress?.({
            type: 'progress',
            frame: parseInt(frameMatch[1], 10),
            totalFrames: parseInt(frameMatch[2], 10),
          });
        }
      }
    });

    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          const stats = await fs.stat(options.outputPath);
          onProgress?.({
            type: 'complete',
            outputPath: options.outputPath,
            fileSize: stats.size,
          });
          resolve({
            type: 'complete',
            outputPath: options.outputPath,
            fileSize: stats.size,
          });
        } catch {
          reject(new Error('Render completed but output file not found'));
        }
      } else {
        reject(new Error(`Render failed (exit ${code}): ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn hyperframes render: ${err.message}`));
    });
  });
}

// ── Media generation (TTS, transcribe, remove-background) ─────────

export interface TtsOptions {
  prompt: string;
  outputPath: string;
  voice?: string;
  speed?: number;
}

export async function generateTts(
  options: TtsOptions,
): Promise<{ outputPath: string; fileSize: number }> {
  const { prompt, outputPath, voice, speed } = options;
  const args = ['hyperframes', 'tts', '--output', outputPath];
  if (voice) args.push('--voice', voice);
  if (speed) args.push('--speed', String(speed));
  args.push('--');
  args.push(prompt);

  return runHfCommand(args, outputPath);
}

export interface TranscribeOptions {
  mediaPath: string;
  outputPath: string;
  model?: string;
  language?: string;
}

export async function generateTranscribe(
  options: TranscribeOptions,
): Promise<{ outputPath: string; fileSize: number }> {
  const { mediaPath, outputPath, model, language } = options;
  const args = ['hyperframes', 'transcribe', mediaPath, '--output', outputPath];
  if (model) args.push('--model', model);
  if (language) args.push('--language', language);

  return runHfCommand(args, outputPath);}

export interface RemoveBackgroundOptions {
  mediaPath: string;
  outputPath: string;
  format?: 'webm' | 'mov';
  backgroundOutput?: string;
}

export async function generateRemoveBackground(
  options: RemoveBackgroundOptions,
): Promise<{ outputPath: string; fileSize: number }> {
  const { mediaPath, outputPath, format, backgroundOutput } = options;
  const args = ['hyperframes', 'remove-background', mediaPath, '-o', outputPath];
  if (format) args.push('--format', format);
  if (backgroundOutput) args.push('--background-output', backgroundOutput);

  return runHfCommand(args, outputPath);}

/** Shared executor for HF media commands that produce an output file. */
async function runHfCommand(
  args: string[],
  outputPath: string,
): Promise<{ outputPath: string; fileSize: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';

    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          const stats = await fs.stat(outputPath);
          resolve({ outputPath, fileSize: stats.size });
        } catch {
          reject(new Error('Command completed but output file not found'));
        }
      } else {
        reject(new Error(`Command failed (exit ${code}): ${stderr.slice(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn hyperframes: ${err.message}`));
    });
  });
}

/**
 * Quick check: is hyperframes CLI available?
 */
export async function checkHyperframesAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['hyperframes', '--version'], {
      stdio: 'ignore',
    });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Check system requirements for HyperFrames:
 * - Node >= 22
 * - FFmpeg available
 * - Chrome/Chromium available (via Puppeteer)
 */
export async function checkSystemRequirements(): Promise<{
  node: boolean;
  ffmpeg: boolean;
  hyperframes: boolean;
}> {
  const [nodeOk, ffmpegOk, hfOk] = await Promise.all([
    Promise.resolve(process.versions.node.split('.')[0] >= '22'),
    new Promise<boolean>((resolve) => {
      const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
      proc.on('close', (c) => resolve(c === 0));
      proc.on('error', () => resolve(false));
    }),
    checkHyperframesAvailable(),
  ]);

  return { node: nodeOk, ffmpeg: ffmpegOk, hyperframes: hfOk };
}

// ── Project scaffolding ──────────────────────────────────────────────

export interface InitOptions {
  projectDir: string;
  example?: string;
  resolution?: string;
}

export async function initProject(options: InitOptions): Promise<void> {
  const args = ['hyperframes', 'init', options.projectDir, '--non-interactive'];
  if (options.example) args.push('--example', options.example);
  if (options.resolution) args.push('--resolution', options.resolution);

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes init failed with exit ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

export async function previewProject(projectDir: string, port?: number): Promise<void> {
  const args = ['hyperframes', 'dev', projectDir];
  if (port) args.push('--port', String(port));

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes dev failed with exit ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

export interface DoctorResult {
  passed: boolean;
  checks: Record<string, boolean | string>;
}

export async function runDoctor(): Promise<DoctorResult> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['hyperframes', 'doctor', '--json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve({ passed: code === 0, checks: result });
      } catch {
        resolve({ passed: false, checks: { error: stderr || 'doctor command failed' } });
      }
    });

    proc.on('error', (err) => {
      resolve({ passed: false, checks: { error: err.message } });
    });
  });
}
