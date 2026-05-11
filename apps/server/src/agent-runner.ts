/**
 * Agent runner — spawns agent CLI processes and pipes their output
 * to the SSE run manager.
 *
 * Sets C2M_* environment variables that the prompt contract tells the
 * agent to use for HyperFrames shell commands.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentDef } from './agents.js';
import type { ChatRun, RunManager } from './runs.js';
import { formatAgentPrompt } from './agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to the Code2MP4 CLI script that agents call
const C2M_BIN = path.resolve(__dirname, '..', 'bin', 'code2mp4-cli.mjs');
// Default daemon URL
const DEFAULT_DAEMON_URL = process.env.C2M_DAEMON_URL ?? process.env.C2M_DAEMON_URL_LEGACY ?? 'http://localhost:7456';

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

  manager.emit(r, 'status', { status: 'starting', agent: agent.name });

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
    C2M_PROJECT_DIR: cwd,                                   // agent's cwd
    C2M_PROJECT_ID: projectId ?? run.projectId ?? '',       // project UUID
    C2M_DAEMON_URL: DEFAULT_DAEMON_URL,
    C2M_BIN: C2M_BIN,                                        // node-executable CLI wrapper
    // Legacy OV_ prefix kept for backward compat
    C2M_PROJECT_DIR_LEGACY: cwd,
    C2M_DAEMON_URL_LEGACY: DEFAULT_DAEMON_URL,
  };

  if (extraAllowedDirs && agent.supportsExtraDirs && agent.id === 'claude') {
    for (const dir of extraAllowedDirs) args.push('--add-dir', dir);
  }

  const child = spawn(agent.bin, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });

  r.child = child;
  r.status = 'running';
  manager.emit(r, 'status', { status: 'running' });

  if (child.stdin) { child.stdin.write(fullPrompt); child.stdin.end(); }

  // stdout — accumulate text content for persistence (stripped stdout)
  let accumulatedText = '';
  let stdoutBuffer = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    const text = stdoutBuffer + chunk.toString();
    if (agent.streamFormat === 'claude-stream-json') {
      stdoutBuffer = parseBufferedLines(text, (line) => parseClaudeStreamLine(line, (event, data) => {
        manager.emit(r, event, data);
        // Only accumulate text/thinking content for persistence
        if (event === 'text' || event === 'text_delta') {
          accumulatedText += (data as { content: string }).content || '';
        }
      }));
    } else if (agent.streamFormat === 'copilot-stream-json') {
      stdoutBuffer = parseBufferedLines(text, (line) => parseCopilotStreamLine(line, (event, data) => {
        manager.emit(r, event, data);
        if (event === 'text') accumulatedText += (data as { content: string }).content || '';
      }));
    } else {
      stdoutBuffer = '';
      // Plain text — strip ANSI, emit + accumulate cleaned content
      const clean = stripAnsi(text);
      for (const line of clean.split('\n')) {
        if (line.trim()) {
          manager.emit(r, 'text', { content: line });
          accumulatedText += line + '\n';
        }
      }
    }
  });

  // stderr
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
    manager.emit(r, 'log', { stream: 'stderr', content: chunk.toString() });
  });

  child.on('close', (code) => {
    if (stdoutBuffer.trim()) {
      if (agent.streamFormat === 'claude-stream-json') {
        parseClaudeStreamLine(stdoutBuffer, (event, data) => {
          manager.emit(r, event, data);
          if (event === 'text' || event === 'text_delta') accumulatedText += (data as { content: string }).content || '';
        });
      } else if (agent.streamFormat === 'copilot-stream-json') {
        parseCopilotStreamLine(stdoutBuffer, (event, data) => {
          manager.emit(r, event, data);
          if (event === 'text') accumulatedText += (data as { content: string }).content || '';
        });
      }
      stdoutBuffer = '';
    }
    const ok = code === 0;
    const wasTerminal = r.status === 'canceled' || r.status === 'failed' || r.status === 'succeeded';
    manager.emit(r, 'status', { status: ok ? 'succeeded' : 'failed', exitCode: code });
    if (!ok && stderr) manager.emit(r, 'log', { stream: 'stderr', content: stderr.slice(-2000) });
    manager.finish(r, ok ? 'succeeded' : 'failed', code);
    if (onComplete && !wasTerminal) onComplete(accumulatedText, ok ? 'succeeded' : 'failed');
  });

  child.on('error', (err) => {
    const wasTerminal = r.status === 'canceled' || r.status === 'failed' || r.status === 'succeeded';
    manager.emit(r, 'log', { stream: 'stderr', content: `Agent spawn error: ${err.message}` });
    manager.finish(r, 'failed', 1);
    if (onComplete && !wasTerminal) onComplete(accumulatedText, 'failed');
  });
}

// ── Stream parsers ───────────────────────────────────────────────────

function parseBufferedLines(text: string, parseLine: (line: string) => void): string {
  const lines = text.split('\n');
  const rest = lines.pop() ?? '';
  for (const line of lines) {
    if (line.trim()) parseLine(line);
  }
  return rest;
}

function parseClaudeStreamLine(line: string, emit: (e: string, d: unknown) => void) {
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

function parseCopilotStreamLine(line: string, emit: (e: string, d: unknown) => void) {
    try {
      const obj = JSON.parse(line);
      if (obj?.type === 'text' || obj?.content) emit('text', { content: obj.content ?? obj.text ?? '' });
      else if (obj?.type) emit('status', obj);
    } catch { if (line.trim()) emit('text', { content: line }); }
}

function stripAnsi(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 27 && text[i + 1] === '[') {
      i += 2;
      while (i < text.length && !/[a-zA-Z]/.test(text[i])) i++;
      continue;
    }
    if ((code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) continue;
    out += text[i];
  }
  return out.replace(/⬝+/g, '');
}
