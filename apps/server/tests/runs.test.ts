import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRunManager } from '../src/runs.js';
import { startAgentRun } from '../src/agent-runner.js';
import type { AgentDef } from '../src/agents.js';

describe('agent run streaming', () => {
  it('buffers split stream-json lines before parsing', async () => {
    const manager = createRunManager();
    const run = manager.create({ projectId: 'project-1', agentId: 'fake' });
    const cwd = mkdtempSync(path.join(tmpdir(), 'c2m-agent-run-'));
    const jsonLine = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'hello from split json' }] },
    }) + '\n';
    const midpoint = Math.floor(jsonLine.length / 2);
    const script = `
      process.stdout.write(${JSON.stringify(jsonLine.slice(0, midpoint))});
      setTimeout(() => {
        process.stdout.write(${JSON.stringify(jsonLine.slice(midpoint))});
      }, 10);
    `;
    const agent: AgentDef = {
      id: 'fake',
      name: 'Fake Agent',
      bin: process.execPath,
      binCandidates: [],
      streamFormat: 'claude-stream-json',
      detected: true,
      models: [{ id: 'default', label: 'Default' }],
      supportsExtraDirs: false,
      buildArgs: () => ['-e', script],
    };

    try {
      const completed = new Promise<string>((resolve) => {
        void startAgentRun({
          run,
          agent,
          userMessage: 'ignored',
          systemPrompt: '',
          cwd,
          manager,
          onComplete: (text) => resolve(text),
        });
      });

      await expect(completed).resolves.toBe('hello from split json');
      expect(run.events.some(ev => ev.event === 'text' && (ev.data as { content: string }).content === 'hello from split json')).toBe(true);
      expect(run.events.some(ev => ev.event === 'text' && String((ev.data as { content: string }).content).includes('"type":"assistant"'))).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
