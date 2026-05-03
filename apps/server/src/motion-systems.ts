/**
 * Motion design system registry.
 * Scans <projectRoot>/motion-systems/* for MOTION.md files.
 * Title comes from the first H1. Category from a
 * `> Category: <name>` blockquote line. Summary is the first paragraph.
 *
 * Analogous to Open Design's design-systems.ts.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface MotionSystemSummary {
  id: string;
  title: string;
  category: string;
  summary: string;
  energy: string;
  swatches: string[];
  body: string;
}

export async function listMotionSystems(root: string): Promise<MotionSystemSummary[]> {
  const out: MotionSystemSummary[] = [];
  let entries: import('fs').Dirent[] = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const motionPath = path.join(root, entry.name, 'MOTION.md');
    try {
      const stats = await stat(motionPath);
      if (!stats.isFile()) continue;
      const raw = await readFile(motionPath, 'utf8');
      const titleMatch = /^#\s+(.+?)\s*$/m.exec(raw);
      const title = titleMatch?.[1]?.trim() ?? entry.name;
      out.push({
        id: entry.name,
        title,
        category: extractCategory(raw) ?? 'Uncategorized',
        summary: summarize(raw),
        energy: extractEnergy(raw) ?? 'medium',
        swatches: extractSwatches(raw),
        body: raw,
      });
    } catch {
      // Skip unreadable entries.
    }
  }
  return out;
}

export async function readMotionSystem(root: string, id: string): Promise<string | null> {
  const file = path.join(root, id, 'MOTION.md');
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

function summarize(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const firstH1 = lines.findIndex((l) => /^#\s+/.test(l));
  if (firstH1 === -1) return '';
  const afterH1 = lines.slice(firstH1 + 1);
  const nextHeading = afterH1.findIndex((l) => /^#{1,6}\s+/.test(l));
  const window = (nextHeading === -1 ? afterH1 : afterH1.slice(0, nextHeading))
    .join('\n')
    .replace(/^>\s*Category:.*$/gim, '')
    .replace(/^>\s*/gm, '')
    .trim();
  return window.split(/\n\n/)[0]?.slice(0, 240) ?? '';
}

function extractCategory(raw: string): string | null {
  const m = /^>\s*Category:\s*(.+?)\s*$/im.exec(raw);
  return m?.[1]?.trim() ?? null;
}

function extractEnergy(raw: string): string | null {
  const m = /^>\s*Energy:\s*(.+?)\s*$/im.exec(raw);
  return m?.[1]?.trim().toLowerCase() ?? null;
}

function extractSwatches(raw: string): string[] {
  const swatches: string[] = [];
  // Extract all hex colors from the Color Palette section
  const re = /`(#[0-9a-fA-F]{3,8})`/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (swatches.length < 5) {
      swatches.push(m[1].toLowerCase());
    }
  }
  return swatches;
}
