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
  it('lists all 8 motion systems from disk', async () => {
    const systems = await listMotionSystems(MOTION_DIR);
    expect(systems.length).toBe(8);
    const ids = systems.map(s => s.id).sort();
    expect(ids).toEqual(['brutalist', 'cinematic', 'editorial', 'neon', 'orbital', 'organic', 'tech', 'warm-soft']);
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

// ── Pipeline validation ──────────────────────────────────────────────

import { validateStoryboard } from '../src/pipeline.js';

function makeScene(id: string, number: number, duration: number) {
  return { id, number, duration, goal: 'Test goal', visual: 'Test visual', text: 'Test text', motion: 'Test motion' };
}

describe('validateStoryboard', () => {
  it('passes a valid storyboard', () => {
    const result = validateStoryboard({
      title: 'Test',
      duration: 30,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 5),
        makeScene('feature', 2, 20),
        makeScene('cta', 3, 5),
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects empty scenes array', () => {
    const result = validateStoryboard({
      title: 'Empty',
      duration: 10,
      aspectRatio: '16:9',
      scenes: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one scene required');
  });

  it('rejects missing title', () => {
    const result = validateStoryboard({
      title: '',
      duration: 30,
      aspectRatio: '16:9',
      scenes: [makeScene('s1', 1, 30)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Storyboard must have a title');
  });

  it('rejects duplicate scene ids', () => {
    const result = validateStoryboard({
      title: 'Dupes',
      duration: 20,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 10),
        makeScene('hook', 2, 10),
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate scene id'))).toBe(true);
  });

  it('rejects scene duration < 2s', () => {
    const result = validateStoryboard({
      title: 'Too short',
      duration: 5,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 1),
        makeScene('cta', 2, 4),
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duration must be'))).toBe(true);
  });

  it('rejects missing scene fields', () => {
    const result = validateStoryboard({
      title: 'Incomplete',
      duration: 10,
      aspectRatio: '16:9',
      scenes: [
        { id: 's1', number: 1, duration: 10, goal: '', visual: '', text: '', motion: '' },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('warns on duration mismatch', () => {
    const result = validateStoryboard({
      title: 'Mismatch',
      duration: 30,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 5),
        makeScene('cta', 2, 5),
      ],
    });
    expect(result.warnings.some(w => w.includes('sum to'))).toBe(true);
  });

  it('warns on long hook scene', () => {
    const result = validateStoryboard({
      title: 'Slow hook',
      duration: 20,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 8),
        makeScene('cta', 2, 12),
      ],
    });
    expect(result.warnings.some(w => w.includes('recommend'))).toBe(true);
  });

  it('warns when storyboard aspect differs from brief', () => {
    const result = validateStoryboard(
      {
        title: 'Wrong aspect',
        duration: 30,
        aspectRatio: '9:16',
        scenes: [
          makeScene('hook', 1, 10),
          makeScene('cta', 2, 20),
        ],
      },
      {
        id: 'test',
        goal: { primary: 'test', secondary: 'test' },
        audience: { who: 'devs', context: 'web', awareness: 'problem-aware' },
        format: { primary: '16:9', duration: 30 },
      },
    );
    expect(result.warnings.some(w => w.includes('differs from brief format'))).toBe(true);
  });

  it('warns on duration mismatch with brief', () => {
    const result = validateStoryboard(
      {
        title: 'Long',
        duration: 60,
        aspectRatio: '16:9',
        scenes: [
          makeScene('s1', 1, 30),
          makeScene('s2', 2, 30),
        ],
      },
      {
        id: 'test',
        goal: { primary: 'test', secondary: 'test' },
        audience: { who: 'devs', context: 'web', awareness: 'problem-aware' },
        format: { primary: '16:9', duration: 30 },
      },
    );
    expect(result.warnings.some(w => w.includes('differs from brief'))).toBe(true);
  });
});
