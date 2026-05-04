/**
 * Script system registry.
 * Scans <projectRoot>/script-systems/* for SCRIPT.md files.
 * Analogous to motion-systems.ts for MOTION.md.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface ScriptSystemSummary {
  id: string;
  title: string;
  category: string;
  summary: string;
  compactSummary: string;
  duration: string;
  scenes: number;
  body: string;
}

export async function listScriptSystems(root: string): Promise<ScriptSystemSummary[]> {
  const out: ScriptSystemSummary[] = [];
  let entries: import('fs').Dirent[] = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const scriptPath = path.join(root, entry.name, 'SCRIPT.md');
    try {
      const st = await stat(scriptPath);
      if (!st.isFile()) continue;
      const raw = await readFile(scriptPath, 'utf8');
      const titleMatch = /^#\s+(.+?)\s*$/m.exec(raw);
      const title = titleMatch?.[1]?.trim() ?? entry.name;
      out.push({
        id: entry.name,
        title,
        category: extractField(raw, 'Category') ?? 'Uncategorized',
        summary: summarize(raw),
        compactSummary: extractField(raw, 'Summary') ?? summarize(raw),
        duration: extractField(raw, 'Duration') ?? '30s',
        scenes: parseInt(extractField(raw, 'Scenes') ?? '5', 10),
        body: raw,
      });
    } catch { /* skip */ }
  }
  return out;
}

export async function readScriptSystem(root: string, id: string): Promise<string | null> {
  const file = path.join(root, id, 'SCRIPT.md');
  try { return await readFile(file, 'utf8'); } catch { return null; }
}

function summarize(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const firstH1 = lines.findIndex(l => /^#\s+/.test(l));
  if (firstH1 === -1) return '';
  const after = lines.slice(firstH1 + 1);
  const nextH = after.findIndex(l => /^#{1,6}\s+/.test(l));
  const window = (nextH === -1 ? after : after.slice(0, nextH))
    .join('\n').replace(/^>\s*.*$/gim, '').trim();
  return window.split(/\n\n/)[0]?.slice(0, 200) ?? '';
}

function extractField(raw: string, label: string): string | null {
  const re = new RegExp(`^>\\s*${label}:\\s*(.+?)\\s*$`, 'im');
  return raw.match(re)?.[1]?.trim() ?? null;
}
