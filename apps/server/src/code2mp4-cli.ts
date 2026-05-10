#!/usr/bin/env node
/**
 * Code2MP4 CLI — the agent-facing dispatcher.
 *
 * Agents call `code2mp4 media generate ...` to request media
 * generation (HyperFrames render) from the daemon. The daemon runs
 * the unsandboxed render and streams progress back.
 *
 * Also handles: media wait, health
 */
const DAEMON_URL = process.env.C2M_DAEMON_URL ?? 'http://localhost:7456';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd) {
    console.error('Usage: od <command> [options]');
    console.error('Commands: media generate, media wait, health');
    process.exit(1);
  }

  if (cmd === 'health') {
    await handleHealth();
  } else if (cmd === 'media') {
    const sub = args[1];
    if (sub === 'generate') {
      await handleMediaGenerate(args.slice(2));
    } else if (sub === 'wait') {
      await handleMediaWait(args.slice(2));
    } else {
      console.error('code2mp4 media: expected generate or wait');
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

async function handleHealth(): Promise<void> {
  try {
    const res = await fetch(`${DAEMON_URL}/api/health`);
    const body = await res.json();
    console.log(JSON.stringify(body));
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error(`WARN: failed to reach daemon at ${DAEMON_URL}: ${(err as Error).message}`);
    process.exit(5);
  }
}

async function handleMediaGenerate(args: string[]): Promise<void> {
  const params = parseNamedArgs(args, {
    project: 'string',
    surface: 'string',
    model: 'string',
    output: 'string',
    'composition-dir': 'string',
    aspect: 'string',
    length: 'number',
    fps: 'number',
    quality: 'string',
    prompt: 'string',
    voice: 'string',
    speed: 'number',
    'audio-kind': 'string',
    'sfx-kind': 'string',
    'sfx-duration': 'number',
    'sfx-frequency': 'number',
    'sfx-volume': 'number',
  });

  const project = params.project;
  if (!project) {
    console.error('Error: --project <project-id> is required');
    process.exit(1);
  }

  const surface = params.surface ?? 'video';
  const model = params.model ?? 'hyperframes-html';

  // Build the request body
  const body: Record<string, unknown> = {
    projectId: project,
    surface,
    model,
    output: params.output ?? 'output.mp4',
    compositionDir: params['composition-dir'],
    aspect: params.aspect,
    length: params.length,
    fps: params.fps,
    quality: params.quality ?? 'standard',
    prompt: params.prompt,
    voice: params.voice,
    speed: params.speed,
    audioKind: params['audio-kind'],
    sfxKind: params['sfx-kind'],
    sfxDuration: params['sfx-duration'],
    sfxFrequency: params['sfx-frequency'],
    sfxVolume: params['sfx-volume'],
  };

  try {
    const res = await fetch(`${DAEMON_URL}/api/media/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`WARN: daemon returned ${res.status}: ${errBody.slice(0, 500)}`);
      process.exit(5);
    }

    const result = await res.json() as { taskId?: string; file?: { name: string; size: number; kind: string } };

    // If the task is async (long-running), return taskId for wait loop
    if (result.taskId) {
      console.log(JSON.stringify({
        taskId: result.taskId,
        status: 'running',
        nextSince: 0,
      }));
      process.exit(2); // exit 2 = still running, caller should poll
    } else if (result.file) {
      // Completed synchronously
      console.log(JSON.stringify({ file: result.file }));
      process.exit(0);
    } else {
      console.log(JSON.stringify(result));
      process.exit(0);
    }
  } catch (err) {
    console.error(`WARN: failed to reach daemon at ${DAEMON_URL}: ${(err as Error).message}`);
    process.exit(5);
  }
}

async function handleMediaWait(args: string[]): Promise<void> {
  const taskId = args[0];
  const sinceIdx = args.indexOf('--since');
  const since = sinceIdx >= 0 ? parseInt(args[sinceIdx + 1], 10) : 0;

  if (!taskId) {
    console.error('Usage: code2mp4 media wait <taskId> [--since N]');
    process.exit(1);
  }

  try {
    const res = await fetch(`${DAEMON_URL}/api/media/wait/${taskId}?since=${since}`, {
      headers: { Accept: 'text/event-stream' },
      // Long poll: 25s timeout
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.error(`WARN: daemon returned ${res.status}`);
      process.exit(5);
    }

    const text = await res.text();

    // Parse SSE to extract progress and final result
    const lines = text.split('\n');
    let lastData = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        lastData = line.slice(6);
        // Stream progress to stderr for agent visibility
        const parsed = JSON.parse(lastData);
        if (parsed.type === 'progress') {
          console.error(`Capturing frame ${parsed.frame}/${parsed.totalFrames}`);
        }
      }
    }

    if (!lastData) {
      console.log(JSON.stringify({ taskId, status: 'running', nextSince: since }));
      process.exit(2);
    }

    const final = JSON.parse(lastData);
    if (final.type === 'complete') {
      console.log(JSON.stringify({ file: { name: final.outputPath, size: final.fileSize, kind: 'video' } }));
      process.exit(0);
    } else if (final.type === 'error') {
      console.error(`WARN: ${final.message}`);
      process.exit(5);
    } else {
      // Still running
      console.log(JSON.stringify({ taskId, status: 'running', nextSince: since + 1 }));
      process.exit(2);
    }
  } catch (err) {
    if ((err as Error).name === 'TimeoutError') {
      // Long poll timed out — still running
      console.log(JSON.stringify({ taskId, status: 'running', nextSince: since }));
      process.exit(2);
    }
    console.error(`WARN: ${(err as Error).message}`);
    process.exit(5);
  }
}

// ── Arg parser ────────────────────────────────────────────────────────

function parseNamedArgs(
  args: string[],
  spec: Record<string, 'string' | 'number'>,
): Record<string, string | number | undefined> {
  const result: Record<string, string | number | undefined> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const type = spec[key];
      if (type) {
        const val = args[i + 1];
        if (val && !val.startsWith('--')) {
          result[key] = type === 'number' ? Number(val) : val;
          i++;
        } else {
          result[key] = type === 'number' ? undefined : '';
        }
      }
    }
  }
  return result;
}

main().catch((err) => {
  console.error(`od: fatal error: ${err.message}`);
  process.exit(1);
});
