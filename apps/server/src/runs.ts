/**
 * Run management + SSE streaming infrastructure.
 *
 * Ported from @open-design/daemon/src/runs.ts and the server.ts SSE wiring.
 * Manages agent child processes, streams output events to clients via SSE,
 * and handles cleanup.
 */
import { randomUUID } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import type { Response } from 'express';

// ── Types ────────────────────────────────────────────────────────────

export interface RunMeta {
  projectId?: string;
  agentId?: string;
  systemPrompt?: string;
}

export type RunStatus = 'queued' | 'starting' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface ChatRun {
  id: string;
  projectId: string | null;
  agentId: string | null;
  status: RunStatus;
  createdAt: number;
  updatedAt: number;
  events: SseEventRecord[];
  nextEventId: number;
  clients: Set<SseClient>;
  child: ChildProcess | null;
  exitCode: number | null;
}

interface SseEventRecord {
  id: number;
  event: string;
  data: unknown;
}

interface SseClient {
  send: (event: string, data: unknown, id?: number) => void;
  end: () => void;
}

const TERMINAL_STATUSES: Set<RunStatus> = new Set(['succeeded', 'failed', 'canceled']);

// ── SSE client factory ───────────────────────────────────────────────

export function createSseClient(res: Response): SseClient {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Keep-alive ping every 25s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25_000);

  return {
    send(event: string, data: unknown, id?: number) {
      try {
        if (id !== undefined) res.write(`id: ${id}\n`);
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client disconnected
      }
    },
    end() {
      clearInterval(keepAlive);
      try {
        res.end();
      } catch {
        // Already closed
      }
    },
  };
}

// ── Run manager ──────────────────────────────────────────────────────

export interface RunManager {
  create(meta: RunMeta): ChatRun;
  get(id: string): ChatRun | null;
  emit(run: ChatRun, event: string, data: unknown): void;
  finish(run: ChatRun, status: RunStatus, exitCode: number | null): void;
  attachClient(runId: string, client: SseClient, afterEventId?: number): void;
  cancel(runId: string): boolean;
  list(): ChatRun[];
  cleanup(): void;
}

export function createRunManager(ttlMs = 30 * 60 * 1000): RunManager {
  const runs = new Map<string, ChatRun>();

  function create(meta: RunMeta): ChatRun {
    const run: ChatRun = {
      id: randomUUID(),
      projectId: meta.projectId ?? null,
      agentId: meta.agentId ?? null,
      status: 'queued',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      events: [],
      nextEventId: 1,
      clients: new Set(),
      child: null,
      exitCode: null,
    };
    runs.set(run.id, run);
    return run;
  }

  function get(id: string): ChatRun | null {
    return runs.get(id) ?? null;
  }

  function emit(run: ChatRun, event: string, data: unknown) {
    const id = run.nextEventId++;
    run.events.push({ id, event, data });
    // Cap event buffer
    if (run.events.length > 2000) {
      run.events.splice(0, run.events.length - 2000);
    }
    run.updatedAt = Date.now();
    for (const client of run.clients) {
      client.send(event, data, id);
    }
  }

  function attachClient(runId: string, client: SseClient, afterEventId = 0) {
    const run = runs.get(runId);
    if (!run) {
      client.send('error', { message: 'Run not found' });
      client.end();
      return;
    }

    // Replay events the client missed
    for (const ev of run.events) {
      if (ev.id > afterEventId) {
        client.send(ev.event, ev.data, ev.id);
      }
    }

    // If run is already terminal, close client
    if (TERMINAL_STATUSES.has(run.status)) {
      client.end();
      return;
    }

    run.clients.add(client);
  }

  function finish(run: ChatRun, status: RunStatus, exitCode: number | null) {
    if (TERMINAL_STATUSES.has(run.status)) return;
    run.status = status;
    run.exitCode = exitCode;
    run.updatedAt = Date.now();
    emit(run, 'end', { status, exitCode });
    for (const client of run.clients) {
      client.end();
    }
    run.clients.clear();

    // Schedule cleanup
    setTimeout(() => {
      if (TERMINAL_STATUSES.has(run.status)) runs.delete(run.id);
    }, ttlMs).unref?.();
  }

  function cancel(runId: string): boolean {
    const run = runs.get(runId);
    if (!run || TERMINAL_STATUSES.has(run.status)) return false;

    try {
      run.child?.kill('SIGTERM');
    } catch {
      // Process may have already exited
    }
    finish(run, 'canceled', null);
    return true;
  }

  function list(): ChatRun[] {
    return Array.from(runs.values()).map((r) => ({
      ...r,
      clients: undefined as unknown as Set<SseClient>, // Don't leak client refs
    })) as ChatRun[];
  }

  function cleanup() {
    for (const [id, run] of runs) {
      if (TERMINAL_STATUSES.has(run.status) && Date.now() - run.updatedAt > ttlMs) {
        runs.delete(id);
      }
    }
  }

  return { create, get, emit, finish, attachClient, cancel, list, cleanup };
}
