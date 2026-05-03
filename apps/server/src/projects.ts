/**
 * Video project file management.
 * Each project is a directory under <root>/projects/<id>/.
 * Files include agent-generated HTML, rendered MP4s, and user uploads.
 * Dot-prefixed directories (.hf-cache/) are hidden from listing.
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProjectFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
  kind: 'html' | 'video' | 'image' | 'audio' | 'text' | 'other';
  mime: string;
}

export function projectDir(root: string, projectId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) throw new Error('Invalid project id');
  return path.join(root, projectId);
}

export async function ensureProjectDir(root: string, projectId: string): Promise<string> {
  const dir = projectDir(root, projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function listProjectFiles(root: string, projectId: string): Promise<ProjectFile[]> {
  const dir = projectDir(root, projectId);
  const out: ProjectFile[] = [];
  await collectFiles(dir, '', out);
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

async function collectFiles(
  baseDir: string,
  relativeDir: string,
  out: ProjectFile[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(path.join(baseDir, relativeDir), { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const rel = relativeDir ? `${relativeDir}/${e.name}` : e.name;
    const full = path.join(baseDir, rel);
    if (e.isDirectory()) {
      await collectFiles(baseDir, rel, out);
      continue;
    }
    if (!e.isFile()) continue;
    const st = await stat(full);
    out.push({
      name: rel,
      path: rel,
      size: st.size,
      mtime: st.mtimeMs,
      kind: kindFor(rel),
      mime: mimeFor(rel),
    });
  }
}

export async function readProjectFile(
  root: string,
  projectId: string,
  filePath: string,
): Promise<Buffer | null> {
  const dir = projectDir(root, projectId);
  const full = path.join(dir, filePath);
  if (!full.startsWith(dir)) throw new Error('Path traversal'); // safety
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function writeProjectFile(
  root: string,
  projectId: string,
  filePath: string,
  content: string | Buffer,
): Promise<void> {
  const dir = projectDir(root, projectId);
  await ensureProjectDir(root, projectId);
  const full = path.join(dir, filePath);
  if (!full.startsWith(dir)) throw new Error('Path traversal');
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content);
}

export async function deleteProjectFile(
  root: string,
  projectId: string,
  filePath: string,
): Promise<boolean> {
  const dir = projectDir(root, projectId);
  const full = path.join(dir, filePath);
  if (!full.startsWith(dir)) throw new Error('Path traversal');
  try {
    await rm(full, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export async function removeProjectDir(root: string, projectId: string): Promise<void> {
  const dir = projectDir(root, projectId);
  await rm(dir, { recursive: true, force: true });
}

function kindFor(name: string): ProjectFile['kind'] {
  const ext = path.extname(name).toLowerCase();
  const kinds: Record<string, ProjectFile['kind']> = {
    '.html': 'html', '.htm': 'html',
    '.mp4': 'video', '.mov': 'video', '.webm': 'video',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.webp': 'image', '.svg': 'image',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
    '.json': 'text', '.md': 'text', '.txt': 'text', '.css': 'text', '.js': 'text', '.ts': 'text',
  };
  return kinds[ext] ?? 'other';
}

function mimeFor(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const mimes: Record<string, string> = {
    '.html': 'text/html',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript',
  };
  return mimes[ext] ?? 'application/octet-stream';
}
