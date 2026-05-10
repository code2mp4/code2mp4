/**
 * Multi-stage video production pipeline.
 *
 * Stage 0: Brief + script — structured intent input (brief.json, script.json)
 * Stage 1: Director — generates a structured storyboard from brief + script
 * Stage 2: Scene Agent — generates one scene at a time
 * Stage 3: Assembly — combines fragments, renders MP4
 *
 * Pipeline state is persisted to the project directory on disk:
 *   projects/<id>/brief.json       — structured brief (input)
 *   projects/<id>/script.json      — structured script (input)
 *   projects/<id>/pipeline.json    — job state
 *   projects/<id>/storyboard.json  — director output
 *   projects/<id>/scenes/          — scene fragments
 *
 * This survives server restarts — read pipeline.json to resume.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

// ── Pipeline types ───────────────────────────────────────────────

export interface PipelineJob {
  id: string;
  projectId: string;
  brief: string;
  status: 'scripting' | 'rendering_scenes' | 'assembling' | 'done' | 'failed';
  script?: Storyboard;
  scenes: PipelineSceneFragment[];
  outputMp4?: string;
  error?: string;
  sceneRunIds?: string[];
}

export interface Storyboard {
  title: string;
  duration: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  motionSystem?: string;
  scenes: StoryboardScene[];
}

export interface StoryboardScene {
  id: string;
  number: number;
  duration: number;
  goal: string;
  visual: string;
  text: string;
  motion: string;
  audio?: string | null;
}

export interface PipelineSceneFragment {
  number: number;
  html: string;
  duration: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
}

export interface VideoBrief {
  id: string;
  goal: { primary: string; secondary: string };
  audience: { who: string; context: string; pain?: string; awareness: string };
  format: { primary: string; variants?: string[]; duration: number };
  constraints?: { noAudio?: boolean; safeZone?: number; includeCaptions?: boolean };
}

export interface VideoScript {
  briefId: string;
  hook: { line: string; type: string; duration: number };
  narrativeArc: string;
  segments: Array<{ id: string; type: string; duration: number; text: string }>;
  cta: { text: string; style: string; duration: number };
}

// ── Validation ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════
// Filesystem persistence — survives server restarts
// ══════════════════════════════════════════════════════════════════

function pipelinePath(projectsRoot: string, jobId: string): string {
  return path.join(projectsRoot, '.pipelines', `${jobId}.json`);
}

function storyboardPath(projectsRoot: string, jobId: string): string {
  return path.join(projectsRoot, '.pipelines', `${jobId}-storyboard.json`);
}

function briefPath(projectsRoot: string, projectId: string): string {
  return path.join(projectsRoot, projectId, 'brief.json');
}

function scriptPath(projectsRoot: string, projectId: string): string {
  return path.join(projectsRoot, projectId, 'script.json');
}

function scenePath(projectsRoot: string, jobId: string, sceneNum: number): string {
  return path.join(projectsRoot, '.pipelines', `${jobId}-scene-${sceneNum}.html`);
}

// ── Load/save brief ──────────────────────────────────────────────

export async function loadBrief(projectsRoot: string, projectId: string): Promise<VideoBrief | null> {
  try {
    const raw = await fs.readFile(briefPath(projectsRoot, projectId), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveBrief(projectsRoot: string, projectId: string, brief: VideoBrief): Promise<void> {
  const dir = path.join(projectsRoot, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(briefPath(projectsRoot, projectId), JSON.stringify(brief, null, 2));
}

// ── Load/save script ─────────────────────────────────────────────

export async function loadScript(projectsRoot: string, projectId: string): Promise<VideoScript | null> {
  try {
    const raw = await fs.readFile(scriptPath(projectsRoot, projectId), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveScript(projectsRoot: string, projectId: string, script: VideoScript): Promise<void> {
  const dir = path.join(projectsRoot, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(scriptPath(projectsRoot, projectId), JSON.stringify(script, null, 2));
}

// ── Load/save pipeline ───────────────────────────────────────────

export async function loadPipelineJob(projectsRoot: string, jobId: string): Promise<PipelineJob | null> {
  try {
    const raw = await fs.readFile(pipelinePath(projectsRoot, jobId), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export async function savePipelineJob(projectsRoot: string, job: PipelineJob): Promise<void> {
  const dir = path.join(projectsRoot, '.pipelines');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(pipelinePath(projectsRoot, job.id), JSON.stringify(job, null, 2));
}

export async function saveStoryboard(projectsRoot: string, jobId: string, storyboard: Storyboard): Promise<void> {
  const dir = path.join(projectsRoot, '.pipelines');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storyboardPath(projectsRoot, jobId), JSON.stringify(storyboard, null, 2));
}

export async function saveSceneFragment(projectsRoot: string, jobId: string, fragment: PipelineSceneFragment): Promise<void> {
  const dir = path.join(projectsRoot, '.pipelines');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(scenePath(projectsRoot, jobId, fragment.number), fragment.html);
}

export async function loadSceneFragment(projectsRoot: string, projectId: string, sceneNum: number): Promise<string | null> {
  try {
    return await fs.readFile(scenePath(projectsRoot, projectId, sceneNum), 'utf8');
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════
// Storyboard validation
// ══════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateStoryboard(storyboard: Storyboard, brief?: VideoBrief): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!storyboard.title) errors.push('Storyboard must have a title');
  if (!storyboard.duration || storyboard.duration <= 0) errors.push('Duration must be positive');
  if (!storyboard.scenes || storyboard.scenes.length === 0) errors.push('At least one scene required');

  if (storyboard.scenes) {
    const totalDuration = storyboard.scenes.reduce((s, sc) => s + (sc.duration || 0), 0);
    if (Math.abs(totalDuration - storyboard.duration) > 1) {
      warnings.push(`Scene durations sum to ${totalDuration}s but storyboard says ${storyboard.duration}s`);
    }

    const ids = new Set<string>();
    for (const scene of storyboard.scenes) {
      if (!scene.id) errors.push(`Scene missing id`);
      else if (ids.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
      else ids.add(scene.id);

      if (!scene.goal) errors.push(`Scene "${scene.id}" missing goal`);
      if (!scene.visual) errors.push(`Scene "${scene.id}" missing visual description`);
      if (!scene.text) errors.push(`Scene "${scene.id}" missing text`);
      if (!scene.motion) errors.push(`Scene "${scene.id}" missing motion description`);
      if (!scene.duration || scene.duration < 2) errors.push(`Scene "${scene.id}" duration must be >= 2s`);
    }

    // First scene should be a hook (≤ 5s)
    const first = storyboard.scenes[0];
    if (first && first.duration > 5) warnings.push(`First scene (hook) is ${first.duration}s — recommend ≤ 5s`);

    // Last scene should be a CTA (≤ 8s)
    const last = storyboard.scenes[storyboard.scenes.length - 1];
    if (last && last.duration > 8) warnings.push(`Last scene (CTA) is ${last.duration}s — recommend ≤ 8s`);
  }

  // Validate against brief if provided
  if (brief) {
    if (storyboard.aspectRatio && brief.format.primary && storyboard.aspectRatio !== brief.format.primary) {
      warnings.push(`Storyboard aspect ${storyboard.aspectRatio} differs from brief format ${brief.format.primary}`);
    }
    if (Math.abs(storyboard.duration - brief.format.duration) > 1) {
      warnings.push(`Storyboard duration ${storyboard.duration}s differs from brief ${brief.format.duration}s`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ══════════════════════════════════════════════════════════════════
// Stage 1 prompt — Director Agent
// ══════════════════════════════════════════════════════════════════

export function buildDirectorPrompt(
  brief: string,
  motionTokens: string,
  scriptSummary: string,
): string {
  return `You are a video director. Generate a structured storyboard from this brief.

BRIEF: ${brief}

VISUAL STYLE: ${motionTokens}

NARRATIVE STRUCTURE: ${scriptSummary}

Return ONLY a JSON storyboard with this exact format (no markdown, no explanation):
{
  "title": "Video Title",
  "duration": 30,
  "aspectRatio": "16:9",
  "scenes": [
    {
      "id": "unique-scene-id",
      "number": 1,
      "duration": 7,
      "goal": "What this scene communicates to the viewer",
      "visual": "Visual description — background, layout, key elements, colors",
      "text": "On-screen text for this scene",
      "motion": "Animation description — entrance, emphasis, exit patterns",
      "audio": "Audio cue (voiceover line, SFX, music — or null)"
    }
  ]
}

Rules:
- Total duration must match the brief
- Scene ids must be unique kebab-case (e.g., "hook", "problem", "feature-1", "cta")
- Scene numbers must be sequential starting from 1
- 3-5 scenes for short videos (< 30s), 5-8 for longer
- Each scene 3-10 seconds (hook ≤ 5s, CTA ≤ 6s)
- First scene is a hook — communicate the core premise
- Last scene is a CTA — tell the viewer what to do
- Goal should be one clear sentence about what this scene achieves
- Visual should describe the layout archetype and specific elements
- Motion should reference the easing from VISUAL STYLE
- Text field is what appears on screen (NOT voiceover audio)`;
}

// ══════════════════════════════════════════════════════════════════
// Stage 2 prompt — Scene Agent
// ══════════════════════════════════════════════════════════════════

export function buildScenePrompt(
  scene: StoryboardScene,
  storyboard: Storyboard,
  motionTokens: string,
  previousScenes: PipelineSceneFragment[],
): string {
  const prevInfo = previousScenes.length > 0
    ? `Previous scenes (match their visual style):\n${previousScenes.filter(s => s.status === 'done').map(s => `Scene ${s.number} — ${s.html.slice(0, 200)}...`).join('\n\n')}`
    : 'This is the first scene.';

  return `You are a motion designer. Create ONE scene for a HyperFrames composition.

STORYBOARD: "${storyboard.title}", ${storyboard.duration}s total, scene ${scene.id}

THIS SCENE:
- Id: ${scene.id}
- Duration: ${scene.duration}s
- Goal: ${scene.goal}
- Visual: ${scene.visual}
- Text: ${scene.text}
- Motion: ${scene.motion}
${scene.audio ? `- Audio: ${scene.audio}` : ''}

${prevInfo}

VISUAL STYLE: ${motionTokens}

CRITICAL RULES:
- class="clip" on ALL elements with data-start
- data-start + data-duration on every timed element
- NO transitions needed (assembly handles scene switching via crossfade)
- window.__timelines["${scene.id}"] = gsap.timeline({paused:true})
- html,body { width:1920px; height:1080px; overflow:hidden }
- Meta viewport: width=1920,height=1080
- Use the exact palette, fonts, and easing from VISUAL STYLE
- Never use Math.random(), Date.now(), or repeat:-1 in GSAP
- Never use <br> in body text — use max-width and natural wrapping
- Font sizes: headlines ≥ 60px, body text ≥ 20px

Return ONLY the HTML for this scene (the <div class="scene"> and its contents + <style> + <script>).
Do NOT include <!DOCTYPE>, <html>, or <body> tags. Just the scene div and its assets.
Do NOT write to a file — output the HTML directly in your response text.`;
}

// ══════════════════════════════════════════════════════════════════
// Stage 3 — Assembly (pure code, no agent)
// ══════════════════════════════════════════════════════════════════

export function assembleComposition(
  job: PipelineJob,
  motionTokens: string,
  musicTrack?: string,
): string {
  const scenes = job.scenes
    .filter(s => s.status === 'done' && s.html)
    .sort((a, b) => a.number - b.number);

  if (scenes.length === 0) throw new Error('No completed scenes to assemble');

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const palette = extractPalette(motionTokens);
  const fonts = extractFonts(motionTokens);

  const sceneDivs = scenes.map((s, i) => `
    <!-- Scene ${s.number} -->
    <div class="scene" data-scene="${s.number}" ${i === 0 ? 'style="opacity:1"' : 'style="opacity:0"'}>
      <div class="scene-content">
        ${s.html}
      </div>
    </div>`).join('\n');

  // Crossfade transitions between consecutive scenes
  const timelineJs = scenes.map((_s, i) => {
    if (i < scenes.length - 1) {
      const transitionTime = scenes.slice(0, i + 1).reduce((sum, prev) => sum + prev.duration, 0) - 0.5;
      return `  // Scene ${scenes[i].number} → ${scenes[i + 1].number} crossfade
  tl.to('[data-scene="${scenes[i + 1].number}"]', { opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${transitionTime});
  tl.to('[data-scene="${scenes[i].number}"]', { opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${transitionTime});`;
    }
    return '';
  }).filter(Boolean).join('\n');

  const audioTag = musicTrack
    ? `<audio id="bg-music" data-start="0" data-duration="${totalDuration}" data-track-index="50" data-volume="0.3" src="${musicTrack}"></audio>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920,height=1080">
<style>
  :root { ${palette} }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1920px; height:1080px; overflow:hidden; background:var(--bg); color:var(--fg); font-family:${fonts}; }
  #stage { position:relative; width:1920px; height:1080px; overflow:hidden; }
  .scene { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; opacity:0; pointer-events:none; }
  .scene:first-child { opacity:1; }
  .scene-content { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:120px 160px; gap:16px; box-sizing:border-box; }
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
<div id="stage" data-composition-id="pipeline" data-start="0" data-duration="${totalDuration}" data-width="1920" data-height="1080">
  ${audioTag}
  ${sceneDivs}
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  ${timelineJs}
  window.__timelines["pipeline"] = tl;
</script>
</body>
</html>`;
}

function extractPalette(tokens: string): string {
  const colors: string[] = [];
  const canvas = tokens.match(/Canvas:\s*(#[0-9a-fA-F]{6})/);
  const accent = tokens.match(/Accent:\s*(#[0-9a-fA-F]{6})/);
  const accent2 = tokens.match(/Accent 2:\s*(#[0-9a-fA-F]{6})/);
  if (canvas) colors.push(`--bg:${canvas[1]}`);
  if (accent) colors.push(`--accent:${accent[1]}`);
  if (accent2) colors.push(`--accent2:${accent2[1]}`);
  colors.push('--fg:#E6EDF3;--muted:#8B949E;--surface:#161B22;--border:#30363D');
  return colors.join(';');
}

function extractFonts(tokens: string): string {
  const display = tokens.match(/Display font:\s*(.+?)(?:\n|$)/);
  return display?.[1]?.trim() || "'Inter', system-ui, sans-serif";
}

export function parseStoryboard(text: string): Storyboard | null {
  const jsonMatch = text.match(/\{[\s\S]*"scenes"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    let cleaned = jsonMatch[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*\]/g, ']')
      .replace(/[\u201C\u201D]/g, '"');
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export function extractSceneHtml(text: string): string | null {
  const contentMatch = text.match(/<div class="scene-content"[\s\S]*?<\/div>\s*<\/div>/i);
  if (contentMatch) return contentMatch[0];

  const divMatch = text.match(/(<div[\s\S]*?<\/div>\s*<script[\s\S]*?<\/script>)/i);
  if (divMatch) return divMatch[1];

  const fenceMatch = text.match(/```html\n([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1];

  const htmlMatch = text.match(/(<div[\s\S]{200,}?<\/div>)/i);
  return htmlMatch?.[1] || null;
}
