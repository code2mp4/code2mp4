/**
 * Agent detection and invocation.
 *
 * Ported from @open-design/daemon/src/agents.ts, simplified to focus on
 * the most common coding-agent CLIs. Scans PATH for installed CLIs,
 * probes their capabilities, and provides argv builders for spawning.
 *
 * Stream formats:
 *   - 'claude-stream-json' : Claude Code's --output-format stream-json
 *   - 'copilot-stream-json': GitHub Copilot's stream format
 *   - 'plain'              : raw text (default for unknown agents)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';

const execFileP = promisify(execFile);

export interface AgentDef {
  id: string;
  name: string;
  bin: string;
  streamFormat: 'claude-stream-json' | 'copilot-stream-json' | 'plain';
  /** Try each of these args to find the binary */
  binCandidates: string[];
  /** Whether this agent was detected on PATH */
  detected: boolean;
  /** Detected version string, if any */
  version?: string;
  /** Supported models (['default'] meaning "let CLI pick") */
  models: Array<{ id: string; label: string }>;
  /** Build spawn args from prompt + options */
  buildArgs: (
    prompt: string,
    cwd: string,
    options?: { model?: string; imagePaths?: string[] },
  ) => string[];
  /** Whether the agent supports an --add-dir equivalent */
  supportsExtraDirs: boolean;
}

export interface AgentDetectionResult {
  agents: AgentDef[];
  defaultAgentId: string | null;
}

// ── CLI definitions ──────────────────────────────────────────────────

const CLAUDE_BIN_CANDIDATES = ['claude'];
const OPENCODE_BIN_CANDIDATES = ['opencode'];
const CODEX_BIN_CANDIDATES = ['codex'];
const GEMINI_BIN_CANDIDATES = ['gemini'];
const CURSOR_BIN_CANDIDATES = ['cursor-agent'];
const QWEN_BIN_CANDIDATES = ['qwen'];

async function findBin(candidates: string[]): Promise<{
  path: string;
  version?: string;
} | null> {
  for (const candidate of candidates) {
    try {
      // Check if binary exists on PATH
      const envPath = process.env.PATH ?? '';
      const dirs = envPath.split(delimiter);
      for (const dir of dirs) {
        const fullPath = `${dir}/${candidate}`;
        if (existsSync(fullPath)) {
          // Try to get version
          let version: string | undefined;
          try {
            const { stdout } = await execFileP(fullPath, ['--version'], {
              timeout: 5000,
            });
            version = stdout.trim().split('\n')[0].slice(0, 80);
          } catch {
            // Version probe failed, continue anyway
          }
          return { path: fullPath, version };
        }
      }
      // Also try just running it (handles cases where `which` would find it)
      try {
        const { stdout } = await execFileP(candidate, ['--version'], {
          timeout: 5000,
        });
        return { path: candidate, version: stdout.trim().split('\n')[0].slice(0, 80) };
      } catch {
        // Not found via this candidate
      }
    } catch {
      // Binary not found or failed
    }
  }
  return null;
}

// ── Agent definitions ───────────────────────────────────────────────

function defineClaude(): AgentDef {
  return {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    binCandidates: CLAUDE_BIN_CANDIDATES,
    streamFormat: 'claude-stream-json',
    detected: false,
    supportsExtraDirs: true,
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'sonnet', label: 'Claude Sonnet 4' },
      { id: 'opus', label: 'Claude Opus 4' },
    ],
    buildArgs(_prompt: string, cwd: string, options?: { model?: string; imagePaths?: string[] }) {
      const args = [
        '-p',                        // read prompt from stdin (not CLI arg)
        '--output-format', 'stream-json',
        '--verbose',
        '--permission-mode', 'bypassPermissions',
      ];
      if (options?.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      // --add-dir for each extra directory
      return args;
    },
  };
}

function defineOpencode(): AgentDef {
  return {
    id: 'opencode',
    name: 'OpenCode',
    bin: 'opencode',
    binCandidates: OPENCODE_BIN_CANDIDATES,
    streamFormat: 'plain',
    detected: false,
    supportsExtraDirs: false,
    models: [{ id: 'default', label: 'Default (CLI config)' }],
    buildArgs(_prompt: string, cwd: string) {
      // OpenCode takes project dir as positional, reads prompt from stdin
      return [cwd];
    },
  };
}

function defineCodex(): AgentDef {
  return {
    id: 'codex',
    name: 'Codex CLI',
    bin: 'codex',
    binCandidates: CODEX_BIN_CANDIDATES,
    streamFormat: 'copilot-stream-json',
    detected: false,
    supportsExtraDirs: false,
    models: [
      { id: 'default', label: 'Default (CLI config)' },
      { id: 'gpt-5.1', label: 'GPT-5.1' },
      { id: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini' },
    ],
    buildArgs(prompt, cwd, options) {
      const args = [
        'exec', '--command', prompt,
        '--yes',
        '--cwd', cwd,
      ];
      if (options?.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      return args;
    },
  };
}

function defineGemini(): AgentDef {
  return {
    id: 'gemini',
    name: 'Gemini CLI',
    bin: 'gemini',
    binCandidates: GEMINI_BIN_CANDIDATES,
    streamFormat: 'plain',
    detected: false,
    supportsExtraDirs: false,
    models: [{ id: 'default', label: 'Default (CLI config)' }],
    buildArgs(prompt, _cwd) {
      return ['-p', prompt, '--yes'];
    },
  };
}

function defineCursor(): AgentDef {
  return {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    bin: 'cursor-agent',
    binCandidates: CURSOR_BIN_CANDIDATES,
    streamFormat: 'plain',
    detected: false,
    supportsExtraDirs: false,
    models: [{ id: 'default', label: 'Default (CLI config)' }],
    buildArgs(prompt, _cwd) {
      return ['-p', prompt, '--yes'];
    },
  };
}

function defineQwen(): AgentDef {
  return {
    id: 'qwen',
    name: 'Qwen Code',
    bin: 'qwen',
    binCandidates: QWEN_BIN_CANDIDATES,
    streamFormat: 'plain',
    detected: false,
    supportsExtraDirs: false,
    models: [{ id: 'default', label: 'Default (CLI config)' }],
    buildArgs(prompt, _cwd) {
      return ['-p', prompt, '--yes'];
    },
  };
}

// ── Detection ────────────────────────────────────────────────────────

const AGENT_DEFINITIONS = [
  defineClaude,
  defineOpencode,
  defineCodex,
  defineGemini,
  defineCursor,
  defineQwen,
];

export async function detectAgents(): Promise<AgentDetectionResult> {
  const results = await Promise.all(
    AGENT_DEFINITIONS.map(async (factory) => {
      const def = factory();
      const found = await findBin(def.binCandidates);
      if (found) {
        def.detected = true;
        def.bin = found.path;
        def.version = found.version;
      }
      return def;
    }),
  );

  const detected = results.filter((a) => a.detected);
  return {
    agents: results,
    defaultAgentId: detected.length > 0 ? detected[0].id : null,
  };
}

export function getAgentDef(agents: AgentDef[], id: string): AgentDef | null {
  return agents.find((a) => a.id === id) ?? null;
}

/**
 * Detect a model from an agent's stdout. Used by the BYOK proxy path.
 */
export function detectModelFromStdout(stdout: string): string | null {
  const m = stdout.match(/"model"\s*:\s*"([^"]+)"/);
  return m?.[1] ?? null;
}

/**
 * Format a system-prompt-enhanced message for the agent.
 * Claude Code reads from stdin when no -p flag; others use -p.
 */
export function formatAgentPrompt(
  systemPrompt: string,
  userMessage: string,
): string {
  return `${systemPrompt}\n\n---\n\n## User message\n\n${userMessage}`;
}
