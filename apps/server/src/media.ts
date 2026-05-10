/**
 * Media generation handler — HyperFrames render pipeline.
 *
 * Handles the `code2mp4 media generate --surface video --model hyperframes-html` dispatch.
 * This runs on the daemon (unsandboxed) because Puppeteer/Chrome don't
 * work under agent shell sandboxes.
 *
 * Long-running renders use task-based async pattern:
 *   1. POST /api/media/generate → returns { taskId, status: 'running' }
 *   2. GET /api/media/wait/:taskId → SSE stream of progress events
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import type { Response } from 'express';
import { generateSfx, type SfxKind } from './audio.js';
import {
  generateTts,
  generateTranscribe,
  generateRemoveBackground,
} from './renderer/hyperframes-bridge.js';

interface RenderTask {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  outputPath: string;
  compositionDir: string;
  quality: string;
  fps: number;
  progress: Array<{ type: string } & Record<string, unknown>>;
  nextSince: number;
  file?: { name: string; size: number; kind: string };
  error?: string;
  createdAt: number;
}

const tasks = new Map<string, RenderTask>();

export async function handleMediaGenerate(req: {
  body: {
    projectId: string;
    surface: string;
    model: string;
    output: string;
    compositionDir?: string;
    aspect?: string;
    length?: number;
    fps?: number;
    quality?: string;
    prompt?: string;
    voice?: string;
    speed?: number;
    audioKind?: string;
    sfxKind?: string;
    sfxDuration?: number;
    sfxFrequency?: number;
    sfxVolume?: number;
    mediaPath?: string;
    transcribeModel?: string;
    transcribeLanguage?: string;
    removeBgFormat?: string;
    removeBgBackgroundOutput?: string;
  };
}, res: Response): Promise<void> {
  const { projectId, model, output, compositionDir, quality, fps, surface, prompt, voice, speed, audioKind, sfxKind, sfxDuration, sfxFrequency, sfxVolume, mediaPath, transcribeModel, transcribeLanguage, removeBgFormat, removeBgBackgroundOutput } = req.body;

  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  // ── Audio surface (TTS, SFX, or transcribe) ───────────────────
  if (surface === 'audio') {
    if (audioKind === 'sfx') {
      handleSfxGenerate(res, projectId, output, sfxKind, sfxDuration, sfxFrequency, sfxVolume);
    } else if (audioKind === 'transcribe') {
      handleTranscribeGenerate(res, projectId, output, mediaPath, transcribeModel, transcribeLanguage);
    } else {
      handleTtsGenerate(res, projectId, output, prompt, voice, speed);
    }
    return;
  }

  // ── Video surface (remove background) ──────────────────────────
  if (surface === 'video' && model === 'hyperframes-remove-bg') {
    handleRemoveBackgroundGenerate(res, projectId, output, mediaPath, removeBgFormat, removeBgBackgroundOutput);
    return;
  }

  if (model === 'hyperframes-html' && !compositionDir) {
    res.status(400).json({ error: '--composition-dir is required for hyperframes-html' });
    return;
  }

  const taskId = randomUUID();
  const task: RenderTask = {
    id: taskId,
    projectId,
    status: 'queued',
    outputPath: output,
    compositionDir: compositionDir ?? '',
    quality: quality ?? 'standard',
    fps: fps ?? 30,
    progress: [],
    nextSince: 0,
    createdAt: Date.now(),
  };

  tasks.set(taskId, task);

  // Fire-and-forget: start render in background
  startRenderTask(task).catch((err) => {
    task.status = 'failed';
    task.error = err.message;
    task.progress.push({ type: 'error', message: err.message });
  });

  // Return immediately with taskId
  res.json({ taskId, status: 'running', nextSince: 0 });
}

export async function handleMediaWait(
  req: { params: { taskId: string }; query: { since?: string }; on: (event: string, cb: () => void) => void },
  res: Response,
): Promise<void> {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const since = parseInt(req.query.since ?? '0', 10);

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // If task is already done or failed, send result immediately
  if (task.status === 'done') {
    res.write(`data: ${JSON.stringify({ type: 'complete', outputPath: task.outputPath, fileSize: task.file?.size ?? 0 })}\n\n`);
    res.end();
    return;
  }
  if (task.status === 'failed') {
    res.write(`data: ${JSON.stringify({ type: 'error', message: task.error ?? 'Render failed' })}\n\n`);
    res.end();
    return;
  }

  // Send progress events the client hasn't seen yet
  const newEvents = task.progress.slice(since);
  for (const ev of newEvents) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }

  // If task still running, set up polling to stream updates
  if (task.status === 'running' || task.status === 'queued') {
    let pollCount = 0;
    const maxPolls = 20; // 20 * 1.5s = 30s max wait
    const interval = setInterval(() => {
      pollCount++;
      const latest = task.progress.slice(task.nextSince);
      for (const ev of latest) {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
      }
      task.nextSince = task.progress.length;

      if (task.status === 'done') {
        res.write(`data: ${JSON.stringify({ type: 'complete', outputPath: task.outputPath, fileSize: task.file?.size ?? 0 })}\n\n`);
        clearInterval(interval);
        res.end();
      } else if (task.status === 'failed') {
        res.write(`data: ${JSON.stringify({ type: 'error', message: task.error ?? 'Render failed' })}\n\n`);
        clearInterval(interval);
        res.end();
      } else if (pollCount >= maxPolls) {
        // Timeout — client should reconnect
        res.write(`data: ${JSON.stringify({ taskId: task.id, status: 'running', nextSince: task.nextSince })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 1500);

    req.on('close', () => clearInterval(interval));
  } else {
    res.end();
  }
}

// ── SFX handler ─────────────────────────────────────────────────────

async function handleSfxGenerate(
  res: Response,
  projectId: string,
  output: string,
  sfxKind?: string,
  sfxDuration?: number,
  sfxFrequency?: number,
  sfxVolume?: number,
): Promise<void> {
  const projectsRoot = path.resolve(process.cwd(), 'projects');
  const outputPath = path.join(projectsRoot, projectId, output || 'sfx-output.wav');

  try {
    await generateSfx({
      kind: (sfxKind as SfxKind) || 'tone',
      outputPath,
      duration: sfxDuration || 0.3,
      frequency: sfxFrequency || 440,
      volume: sfxVolume || 0.5,
    });

    const stats = await fs.promises.stat(outputPath);
    res.json({
      file: { name: path.basename(outputPath), size: stats.size, kind: 'audio', mime: 'audio/wav' },
    });
  } catch (err) {
    res.status(500).json({ error: `SFX generation failed: ${(err as Error).message}` });
  }
}

// ── TTS handler ──────────────────────────────────────────────────────

async function handleTtsGenerate(
  res: Response,
  projectId: string,
  output: string,
  prompt?: string,
  voice?: string,
  speed?: number,
): Promise<void> {
  if (!prompt) {
    res.status(400).json({ error: '--prompt is required for TTS generation' });
    return;
  }

  const pathModule = await import('node:path');
  const fsp = await import('node:fs/promises');

  const projectsRoot = pathModule.resolve(process.cwd(), 'projects');
  const outputPath = pathModule.join(projectsRoot, projectId, output || 'tts-output.wav');
  await fsp.mkdir(pathModule.dirname(outputPath), { recursive: true });

  try {
    const result = await generateTts({ prompt, outputPath, voice, speed });
    res.json({
      file: { name: pathModule.basename(outputPath), size: result.fileSize, kind: 'audio', mime: 'audio/wav' },
    });
  } catch (err) {
    res.status(500).json({ error: `TTS generation failed: ${(err as Error).message}` });
  }
}

// ── Transcribe handler ────────────────────────────────────────────────

async function handleTranscribeGenerate(
  res: Response,
  projectId: string,
  output: string,
  mediaPath?: string,
  model?: string,
  language?: string,
): Promise<void> {
  if (!mediaPath) {
    res.status(400).json({ error: '--media-path is required for transcription' });
    return;
  }

  const pathModule = await import('node:path');
  const fsp = await import('node:fs/promises');

  const projectsRoot = pathModule.resolve(process.cwd(), 'projects');
  const outputPath = pathModule.join(projectsRoot, projectId, output || 'transcript.json');
  await fsp.mkdir(pathModule.dirname(outputPath), { recursive: true });

  try {
    const result = await generateTranscribe({ mediaPath, outputPath, model, language });
    res.json({
      file: { name: pathModule.basename(outputPath), size: result.fileSize, kind: 'text', mime: 'application/json' },
    });
  } catch (err) {
    res.status(500).json({ error: `Transcription failed: ${(err as Error).message}` });
  }
}

// ── Remove-background handler ─────────────────────────────────────────

async function handleRemoveBackgroundGenerate(
  res: Response,
  projectId: string,
  output: string,
  mediaPath?: string,
  format?: string,
  backgroundOutput?: string,
): Promise<void> {
  if (!mediaPath) {
    res.status(400).json({ error: '--media-path is required for remove-background' });
    return;
  }

  const pathModule = await import('node:path');
  const fsp = await import('node:fs/promises');

  const projectsRoot = pathModule.resolve(process.cwd(), 'projects');
  const outputPath = pathModule.join(projectsRoot, projectId, output || 'output.webm');
  await fsp.mkdir(pathModule.dirname(outputPath), { recursive: true });

  try {
    const result = await generateRemoveBackground({
      mediaPath, outputPath,
      format: format as 'webm' | 'mov' | undefined,
      backgroundOutput,
    });
    res.json({
      file: { name: pathModule.basename(outputPath), size: result.fileSize, kind: 'video', mime: format === 'mov' ? 'video/quicktime' : 'video/webm' },
    });
  } catch (err) {
    res.status(500).json({ error: `Remove-background failed: ${(err as Error).message}` });
  }
}

// ── Render task runner ────────────────────────────────────────────────

async function startRenderTask(task: RenderTask): Promise<void> {
  const { spawn } = await import('node:child_process');

  task.status = 'running';

  // Determine the composition dir — may be relative to project dir
  const projectsRoot = path.resolve(process.cwd(), 'projects');
  let compDir = task.compositionDir;

  // If relative, resolve against project dir
  if (compDir && !path.isAbsolute(compDir)) {
    compDir = path.join(projectsRoot, task.projectId, compDir);
  }

  // If the compDir doesn't exist but the project has a .hf-cache dir, use the latest one
  if (!fs.existsSync(compDir)) {
    const projectDir = path.join(projectsRoot, task.projectId);
    const cacheDir = path.join(projectDir, '.hf-cache');
    if (fs.existsSync(cacheDir)) {
      const entries = fs.readdirSync(cacheDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name));
      if (entries.length > 0) {
        compDir = path.join(cacheDir, entries[0].name);
      }
    }
  }

  if (!fs.existsSync(compDir)) {
    task.status = 'failed';
    task.error = `Composition directory not found: ${compDir}`;
    task.progress.push({ type: 'error', message: task.error });
    return;
  }

  // Check for index.html
  const indexHtml = path.join(compDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    task.status = 'failed';
    task.error = `index.html not found in ${compDir}`;
    task.progress.push({ type: 'error', message: task.error });
    return;
  }

  const outputPath = path.join(projectsRoot, task.projectId, task.outputPath);
  const args = [
    'hyperframes', 'render',
    '--format', 'mp4',
    '--quality', task.quality,
    '--fps', String(task.fps),
    '--output', outputPath,
  ];

  return new Promise<void>((resolve) => {
    const child = spawn('npx', args, {
      cwd: compDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env as Record<string, string>, PUPPETEER_HEADLESS: 'true', HF_NO_TELEMETRY: '1' },
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        const m = line.match(/frame\s+(\d+)\/(\d+)/i);
        if (m) {
          const ev = { type: 'progress', frame: parseInt(m[1], 10), totalFrames: parseInt(m[2], 10) } as const;
          task.progress.push(ev);
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      task.progress.push({ type: 'log', content: chunk.toString().trim() });
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const stats = fs.statSync(outputPath);
          task.status = 'done';
          task.file = { name: task.outputPath, size: stats.size, kind: 'video' };
          task.progress.push({ type: 'complete', outputPath, fileSize: stats.size });
        } catch {
          task.status = 'failed';
          task.error = 'Render completed but output file not found';
        }
      } else {
        task.status = 'failed';
        task.error = `Render failed with exit code ${code}`;
      }
      resolve();
    });

    child.on('error', (err) => {
      task.status = 'failed';
      task.error = err.message;
      resolve();
    });
  });
}

/** Cleanup old tasks (30+ min) */
export function cleanupMediaTasks(): void {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, task] of tasks) {
    if (task.createdAt < cutoff) tasks.delete(id);
  }
}
