/**
 * Agent runner — spawns agent CLI processes and pipes their output
 * to the SSE run manager.
 *
 * Sets OD_* environment variables that the prompt contract tells the
 * agent to use for HyperFrames shell commands.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentDef } from './agents.js';
import type { ChatRun, RunManager } from './runs.js';
import { formatAgentPrompt } from './agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to the od CLI script that agents call
const OD_BIN = path.resolve(__dirname, '..', 'cli.js');
// Default daemon URL
const DEFAULT_DAEMON_URL = process.env.OV_DAEMON_URL ?? 'http://localhost:7456';

export interface AgentRunOptions {
  run: ChatRun;
  agent: AgentDef;
  userMessage: string;
  systemPrompt: string;
  cwd: string;
  manager: RunManager;
  projectId?: string;
  extraAllowedDirs?: string[];
  /** Called when run completes with accumulated text */
  onComplete?: (accumulatedText: string, status: 'succeeded' | 'failed') => void;
}

export async function startAgentRun({
  run, agent, userMessage, systemPrompt, cwd, manager, projectId, extraAllowedDirs, onComplete,
}: AgentRunOptions): Promise<void> {
  const r = run;
  r.status = 'starting';

  const fullPrompt = formatAgentPrompt(systemPrompt, userMessage);
  const args = agent.buildArgs(fullPrompt, cwd);

  emitToRun(r, 'status', { status: 'starting', agent: agent.name });

  // ── Environment variables the agent contract depends on ───────────
  // Strip API keys from the agent environment (security). The daemon
  // handles provider calls; the agent should never see credentials.
  const safeEnv: Record<string, string> = {};
  const stripKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_BASE_URL', 'OPENAI_BASE_URL'];
  for (const [k, v] of Object.entries(process.env as Record<string, string>)) {
    if (!stripKeys.includes(k) && !k.endsWith('_API_KEY') && !k.endsWith('_TOKEN')) {
      safeEnv[k] = v;
    }
  }

  const env: Record<string, string> = {
    ...safeEnv,
    OD_PROJECT_DIR: cwd,                                   // agent's cwd
    OD_PROJECT_ID: projectId ?? run.projectId ?? '',       // project UUID
    OD_DAEMON_URL: process.env.OV_DAEMON_URL ?? DEFAULT_DAEMON_URL,
    OD_BIN: OD_BIN,                                        // path to `od` CLI
    // Legacy OV_ prefix kept for backward compat
    OV_PROJECT_DIR: cwd,
    OV_DAEMON_URL: DEFAULT_DAEMON_URL,
  };

  if (extraAllowedDirs && agent.supportsExtraDirs && agent.id === 'claude') {
    for (const dir of extraAllowedDirs) args.push('--add-dir', dir);
  }

  const child = spawn(agent.bin, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });

  r.child = child;
  r.status = 'running';
  emitToRun(r, 'status', { status: 'running' });

  if (child.stdin) { child.stdin.write(fullPrompt); child.stdin.end(); }

  // stdout — accumulate text content for persistence (stripped stdout)
  let accumulatedText = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    if (agent.streamFormat === 'claude-stream-json') {
      parseClaudeStream(text, (event, data) => {
        emitToRun(r, event, data);
        // Only accumulate text/thinking content for persistence
        if (event === 'text' || event === 'text_delta') {
          accumulatedText += (data as { content: string }).content || '';
        }
      });
    } else if (agent.streamFormat === 'copilot-stream-json') {
      parseCopilotStream(text, (event, data) => emitToRun(r, event, data));
    } else {
      // Plain text — strip ANSI, emit + accumulate cleaned content
      const clean = stripAnsi(text);
      for (const line of clean.split('\n')) {
        if (line.trim()) {
          emitToRun(r, 'text', { content: line });
          accumulatedText += line + '\n';
        }
      }
    }
  });

  // stderr
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
    emitToRun(r, 'log', { stream: 'stderr', content: chunk.toString() });
  });

  child.on('close', (code) => {
    const ok = code === 0;
    emitToRun(r, 'status', { status: ok ? 'succeeded' : 'failed', exitCode: code });
    if (!ok && stderr) emitToRun(r, 'log', { stream: 'stderr', content: stderr.slice(-2000) });
    finishRun(r, ok ? 'succeeded' : 'failed', code);
    if (onComplete) onComplete(accumulatedText, ok ? 'succeeded' : 'failed');
  });

  child.on('error', (err) => {
    emitToRun(r, 'log', { stream: 'stderr', content: `Agent spawn error: ${err.message}` });
    finishRun(r, 'failed', 1);
    if (onComplete) onComplete(accumulatedText, 'failed');
  });
}

// ── Stream parsers ───────────────────────────────────────────────────

function parseClaudeStream(chunk: string, emit: (e: string, d: unknown) => void) {
  for (const line of chunk.split('\n').filter(Boolean)) {
    try {
      const obj = JSON.parse(line);
      if (obj?.type === 'assistant' && obj.message?.content) {
        for (const block of obj.message.content) {
          if (block.type === 'text' && block.text) emit('text', { content: block.text });
          if (block.type === 'tool_use') emit('tool_use', { id: block.id, name: block.name, input: block.input });
        }
      } else if (obj?.type === 'stream_event') {
        if (obj.event?.content_block?.type === 'text') emit('text_delta', { content: obj.event.content_block.text });
        if (obj.event?.content_block?.type === 'tool_use') emit('tool_use_delta', { id: obj.event.content_block.id, name: obj.event.content_block.name });
      } else if (obj?.type === 'user' && obj.message?.content) {
        for (const block of obj.message.content) {
          if (block.type === 'tool_result') emit('tool_result', { tool_use_id: block.tool_use_id, content: block.content, is_error: block.is_error });
        }
      } else if (obj?.type === 'system') {
        emit('status', { label: obj.subtype ?? 'system', ...obj });
      }
    } catch { if (line.trim()) emit('text', { content: line }); }
  }
}

function parseCopilotStream(chunk: string, emit: (e: string, d: unknown) => void) {
  for (const line of chunk.split('\n').filter(Boolean)) {
    try {
      const obj = JSON.parse(line);
      if (obj?.type === 'text' || obj?.content) emit('text', { content: obj.content ?? obj.text ?? '' });
      else if (obj?.type) emit('status', obj);
    } catch { if (line.trim()) emit('text', { content: line }); }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function emitToRun(run: ChatRun, event: string, data: unknown) {
  const id = run.nextEventId++;
  run.events.push({ id, event, data });
  run.updatedAt = Date.now();
  for (const client of run.clients) client.send(event, data, id);
}

function finishRun(run: ChatRun, status: 'succeeded' | 'failed', code: number | null, onComplete?: (text: string, s: 'succeeded' | 'failed') => void) {
  for (const client of run.clients) { client.send('end', { status, exitCode: code }); client.end(); }
  run.status = status;
  run.exitCode = code;
  run.clients.clear();
}

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[\?[0-9;]*[hl]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/⬝+/g, '');
}
