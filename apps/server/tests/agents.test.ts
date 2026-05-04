import { describe, it, expect } from 'vitest';
import { detectAgents, getAgentDef, formatAgentPrompt } from '../src/agents.js';

describe('agents', () => {
  it('detects agents on PATH without crashing', async () => {
    const result = await detectAgents();
    expect(result).toHaveProperty('agents');
    expect(result).toHaveProperty('defaultAgentId');
    expect(Array.isArray(result.agents)).toBe(true);
    // At minimum, the 6 agent definitions should exist
    expect(result.agents.length).toBeGreaterThanOrEqual(6);
    // Claude Code is the most common, but detection depends on PATH
    const claude = result.agents.find(a => a.id === 'claude');
    expect(claude).toBeTruthy();
    expect(claude!.streamFormat).toBe('claude-stream-json');
  });

  it('returns correct agent by ID', async () => {
    const result = await detectAgents();
    const claude = getAgentDef(result.agents, 'claude');
    expect(claude).toBeTruthy();
    expect(claude!.name).toBe('Claude Code');
    expect(claude!.buildArgs).toBeInstanceOf(Function);

    const opencode = getAgentDef(result.agents, 'opencode');
    expect(opencode).toBeTruthy();
    expect(opencode!.name).toBe('OpenCode');
  });

  it('returns null for unknown agent', async () => {
    const result = await detectAgents();
    expect(getAgentDef(result.agents, 'nonexistent')).toBeNull();
  });

  it('builds Claude Code args with model selection', async () => {
    const result = await detectAgents();
    const claude = getAgentDef(result.agents, 'claude')!;
    const args = claude.buildArgs('test prompt', '/tmp/test', { model: 'sonnet' });
    expect(args).toContain('-p');
    expect(args).toContain('test prompt');
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--model');
    expect(args).toContain('sonnet');
  });

  it('builds Codex CLI args correctly', async () => {
    const result = await detectAgents();
    const codex = getAgentDef(result.agents, 'codex')!;
    const args = codex.buildArgs('test', '/tmp/project');
    expect(args).toContain('exec');
    expect(args).toContain('--command');
    expect(args).toContain('--yes');
    expect(args).toContain('--cwd');
  });

  it('formats agent prompt with system + user message', () => {
    const result = formatAgentPrompt('SYSTEM PROMPT', 'User says hello');
    expect(result).toContain('SYSTEM PROMPT');
    expect(result).toContain('User says hello');
    expect(result).toContain('User message');
  });

  it('each agent has a unique ID', async () => {
    const result = await detectAgents();
    const ids = result.agents.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all agents declare a streamFormat', async () => {
    const result = await detectAgents();
    for (const agent of result.agents) {
      expect(['claude-stream-json', 'copilot-stream-json', 'plain']).toContain(agent.streamFormat);
    }
  });
});
