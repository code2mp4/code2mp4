/**
 * Video skills registry.
 * Scans <projectRoot>/video-skills/* for SKILL.md files.
 * Parses YAML frontmatter for name, description, triggers, etc.
 *
 * Analogous to Open Design's skills.ts.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface VideoSkillSummary {
  id: string;
  name: string;
  description: string;
  mode: string;
  surface: string;
  scenario: string;
}

export interface VideoSkillDetail {
  id: string;
  name: string;
  description: string;
  mode: string;
  surface: string;
  scenario: string;
  body: string;
  dir: string;
}

/**
 * Quick YAML frontmatter parser (no external deps).
 * Extracts YAML between --- markers at the start of markdown.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yamlBlock = match[1];
  const body = match[2];

  // Simple YAML parser for flat key-value pairs
  const data: Record<string, unknown> = {};
  const lines = yamlBlock.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^(\w[\w_-]*)\s*:\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let value: string = kv[2].trim();

      // Handle multiline values (| indicator)
      if (value === '|' || value === '|-' || value === '>') {
        const chunks: string[] = [];
        while (i + 1 < lines.length && lines[i + 1].match(/^\s{2,}/)) {
          i++;
          chunks.push(lines[i].trimStart());
        }
        value = chunks.join('\n').trim();
      }

      // Handle inline arrays: [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        data[key] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        // Strip optional quotes
        data[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }

    // Handle nested od.* keys
    const nested = line.match(/^\s{2}(\w[\w_]*)\s*:\s*(.*)$/);
    if (nested && data["code2mp4"]) {
      const nestedKey = nested[1];
      let nestedValue: string = nested[2].trim();
      nestedValue = nestedValue.replace(/^['"]|['"]$/g, '');
      (data["code2mp4"] as Record<string, unknown>)[nestedKey] = nestedValue;
    }

    // Start of od: block
    if (line.match(/^od\s*:/)) {
      data["code2mp4"] = {};
    }
  }

  return { data, body };
}

export async function listVideoSkills(skillsRoot: string): Promise<VideoSkillSummary[]> {
  const out: VideoSkillSummary[] = [];
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsRoot, entry.name, 'SKILL.md');
    try {
      const stats = await stat(skillPath);
      if (!stats.isFile()) continue;
      const raw = await readFile(skillPath, 'utf8');
      const { data } = parseFrontmatter(raw);

      const description = String(data.description ?? '').replace(/\n\s*/g, ' ').trim();
      const mode = String(data.od && (data.od as Record<string, unknown>).mode || inferMode(description));
      const surface = String(data.od && (data.od as Record<string, unknown>).surface || mode);

      out.push({
        id: String(data.name || entry.name),
        name: String(data.name || entry.name),
        description,
        mode,
        surface,
        scenario: String(data.od && (data.od as Record<string, unknown>).scenario || 'general'),
      });
    } catch {
      // Skip
    }
  }
  return out;
}

export async function readVideoSkill(
  skillsRoot: string,
  id: string,
): Promise<VideoSkillDetail | null> {
  const file = path.join(skillsRoot, id, 'SKILL.md');
  try {
    const raw = await readFile(file, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const description = String(data.description ?? '').replace(/\n\s*/g, ' ').trim();
    const mode = String(data.od && (data.od as Record<string, unknown>).mode || inferMode(description));
    const surface = String(data.od && (data.od as Record<string, unknown>).surface || mode);

    return {
      id: String(data.name || id),
      name: String(data.name || id),
      description,
      mode,
      surface,
      scenario: String(data.od && (data.od as Record<string, unknown>).scenario || 'general'),
      body: withSkillRootPreamble(body, path.join(skillsRoot, id)),
      dir: path.join(skillsRoot, id),
    };
  } catch {
    return null;
  }
}

export async function listVideoSkillDirs(skillsRoot?: string): Promise<string[]> {
  const root = skillsRoot ?? '';
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
  } catch {
    return [];
  }
}

function inferMode(description: string): string {
  const hay = description.toLowerCase();
  if (/\bvideo|motion|shortform|animation|视觉|动效|短片/.test(hay)) return 'video';
  if (/\bimage|poster|illustration|图片|海报/.test(hay)) return 'image';
  if (/\baudio|music|tts|sound|音频|音乐/.test(hay)) return 'audio';
  return 'video';
}

function withSkillRootPreamble(body: string, dir: string): string {
  return [
    `> **Skill root (absolute):** \`${dir}\``,
    '>',
    '> This skill ships side files alongside `SKILL.md`. When the workflow',
    '> below references relative paths, resolve them against the skill root above.',
    '',
    body,
  ].join('\n');
}
