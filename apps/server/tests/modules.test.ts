import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMotionSystems, readMotionSystem } from '../src/motion-systems.js';
import { listVideoSkills, readVideoSkill } from '../src/video-skills-loader.js';
import { ensureProjectDir, writeProjectFile, readProjectFile, listProjectFiles, deleteProjectFile, removeProjectDir } from '../src/projects.js';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const MOTION_DIR = path.join(ROOT, 'motion-systems');
const SKILLS_DIR = path.join(ROOT, 'video-skills');

describe('motion-systems', () => {
  it('lists all 5 motion systems from disk', async () => {
    const systems = await listMotionSystems(MOTION_DIR);
    expect(systems.length).toBe(5);
    const ids = systems.map(s => s.id).sort();
    expect(ids).toEqual(['brutalist', 'cinematic', 'editorial', 'tech', 'warm-soft']);
  });

  it('each system has required fields', async () => {
    const systems = await listMotionSystems(MOTION_DIR);
    for (const sys of systems) {
      expect(sys.id).toBeTruthy();
      expect(sys.title).toBeTruthy();
      expect(sys.energy).toBeTruthy();
      expect(sys.swatches.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('reads a specific MOTION.md with full body', async () => {
    const body = await readMotionSystem(MOTION_DIR, 'tech');
    expect(body).toBeTruthy();
    expect(body!).toContain('Tech / Terminal');
    expect(body!).toContain('#0D1117');
    expect(body!).toContain('#58A6FF');
    expect(body!).toContain('Easing Signatures');
    expect(body!.length).toBeGreaterThan(2000);
  });

  it('returns null for unknown system', async () => {
    expect(await readMotionSystem(MOTION_DIR, 'nonexistent')).toBeNull();
  });

  it('editorial system has warm canvas', async () => {
    const body = await readMotionSystem(MOTION_DIR, 'editorial');
    expect(body!).toContain('#F5F0EB');
    expect(body!).toContain('#C44F34');
    expect(body!).toContain('Playfair Display');
  });
});

describe('video-skills-loader', () => {
  it('lists all 8 video skills from disk', async () => {
    const skills = await listVideoSkills(SKILLS_DIR);
    expect(skills.length).toBe(8);
    const ids = skills.map(s => s.id).sort();
    expect(ids).toEqual([
      'audio-reactive-video',
      'caption-reel-video',
      'code2mp4-director',
      'code2mp4-reviewer',
      'motion-brand-intro',
      'product-launch-video',
      'social-short-video',
      'tutorial-video',
    ]);
  });

  it('each skill has required fields', async () => {
    const skills = await listVideoSkills(SKILLS_DIR);
    for (const skill of skills) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.mode).toBe('video');
      expect(skill.surface).toBe('video');
    }
  });

  it('reads a specific SKILL.md with frontmatter parsing', async () => {
    const skill = await readVideoSkill(SKILLS_DIR, 'product-launch');
    expect(skill).toBeTruthy();
    expect(skill!.name).toBe('product-launch-video');
    expect(skill!.body).toContain('Product Launch Video');
    expect(skill!.body).toContain('Skill root (absolute)');
    expect(skill!.dir).toContain('product-launch');
  });

  it('prefixes skill body with skill root directory', async () => {
    const skill = await readVideoSkill(SKILLS_DIR, 'social-short');
    expect(skill!.body.startsWith('> **Skill root')).toBe(true);
  });
});

describe('projects (file management)', () => {
  let tmpDir: string;
  const projectId = 'test-project-001';

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'ov-proj-test-'));
  });

  afterAll(() => {
    try { removeProjectDir(tmpDir, projectId); } catch {}
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('creates project directory', async () => {
    const dir = await ensureProjectDir(tmpDir, projectId);
    expect(dir).toContain(projectId);
  });

  it('writes and reads a project file', async () => {
    await writeProjectFile(tmpDir, projectId, 'test.txt', 'Hello World');
    const content = await readProjectFile(tmpDir, projectId, 'test.txt');
    expect(content).toBeTruthy();
    expect(content!.toString()).toBe('Hello World');
  });

  it('writes files in subdirectories', async () => {
    await writeProjectFile(tmpDir, projectId, 'sub/dir/file.html', '<html></html>');
    const content = await readProjectFile(tmpDir, projectId, 'sub/dir/file.html');
    expect(content!.toString()).toBe('<html></html>');
  });

  it('lists files with kinds', async () => {
    // Clean up from previous tests
    try { await removeProjectDir(tmpDir, projectId); } catch {}
    await ensureProjectDir(tmpDir, projectId);
    await writeProjectFile(tmpDir, projectId, 'video.mp4', 'fake-mp4');
    await writeProjectFile(tmpDir, projectId, 'page.html', '<!doctype html>');
    await writeProjectFile(tmpDir, projectId, 'logo.png', 'fake-png');

    const files = await listProjectFiles(tmpDir, projectId);
    expect(files.length).toBe(3);

    const htmlFile = files.find(f => f.name === 'page.html');
    expect(htmlFile).toBeTruthy();
    expect(htmlFile!.kind).toBe('html');
    expect(htmlFile!.mime).toBe('text/html');

    const videoFile = files.find(f => f.name === 'video.mp4');
    expect(videoFile!.kind).toBe('video');
    expect(videoFile!.mime).toBe('video/mp4');
  });

  it('deletes a file', async () => {
    await writeProjectFile(tmpDir, projectId, 'to-delete.txt', 'bye');
    let deleted = await deleteProjectFile(tmpDir, projectId, 'to-delete.txt');
    expect(deleted).toBe(true);
    const content = await readProjectFile(tmpDir, projectId, 'to-delete.txt');
    expect(content).toBeNull();
  });

  it('hides dot-prefixed directories from listing', async () => {
    await ensureProjectDir(tmpDir, projectId);
    await writeProjectFile(tmpDir, projectId, '.hf-cache/comp-1/index.html', 'cache');
    await writeProjectFile(tmpDir, projectId, 'visible.txt', 'visible');

    const files = await listProjectFiles(tmpDir, projectId);
    const visible = files.filter(f => !f.path.includes('.hf-cache'));
    // .hf-cache files should be hidden
    expect(files.find(f => f.path.includes('.hf-cache'))).toBeUndefined();
    // But visible files should be there
    expect(visible.find(f => f.name === 'visible.txt')).toBeTruthy();
  });

  it('throws on path traversal attempts', () => {
    expect(() => writeProjectFile(tmpDir, projectId, '../../../etc/passwd', 'hack')).rejects.toThrow();
  });

  it('returns null for non-existent file', async () => {
    expect(await readProjectFile(tmpDir, projectId, 'does-not-exist.txt')).toBeNull();
  });
});
