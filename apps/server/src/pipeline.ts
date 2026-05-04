/**
 * Multi-stage video production pipeline.
 *
 * Stage 1: Director — generates a structured storyboard from user brief
 * Stage 2: Scene Agent — generates one scene at a time
 * Stage 3: Assembly — combines fragments, renders MP4
 *
 * Pipeline state is persisted to the project directory on disk:
 *   projects/<id>/pipeline.json   — job state
 *   projects/<id>/storyboard.json — director output
 *   projects/<id>/scenes/         — scene fragments
 *
 * This survives server restarts — read pipeline.json to resume.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

export interface PipelineJob {
  id: string;
  projectId: string;
  brief: string;
  status: 'scripting' | 'rendering_scenes' | 'assembling' | 'done' | 'failed';
  script?: Storyboard;
  scenes: SceneFragment[];
  outputMp4?: string;
  error?: string;
  sceneRunIds: string[];
}

// ══════════════════════════════════════════════════════════════════
// Filesystem persistence — survives server restarts
// ══════════════════════════════════════════════════════════════════

function pipelinePath(projectsRoot: string, projectId: string): string {
  return path.join(projectsRoot, projectId, 'pipeline.json');
}

function storyboardPath(projectsRoot: string, projectId: string): string {
  return path.join(projectsRoot, projectId, 'storyboard.json');
}

function scenePath(projectsRoot: string, projectId: string, sceneNum: number): string {
  return path.join(projectsRoot, projectId, 'scenes', `scene-${sceneNum}.html`);
}

export async function loadPipelineJob(projectsRoot: string, projectId: string): Promise<PipelineJob | null> {
  try {
    const raw = await fs.readFile(pipelinePath(projectsRoot, projectId), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export async function savePipelineJob(projectsRoot: string, job: PipelineJob): Promise<void> {
  const dir = path.join(projectsRoot, job.projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(pipelinePath(projectsRoot, job.projectId), JSON.stringify(job, null, 2));
}

export async function saveStoryboard(projectsRoot: string, projectId: string, script: Storyboard): Promise<void> {
  const dir = path.join(projectsRoot, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storyboardPath(projectsRoot, projectId), JSON.stringify(script, null, 2));
}

export async function saveSceneFragment(projectsRoot: string, projectId: string, fragment: SceneFragment): Promise<void> {
  const dir = path.join(projectsRoot, projectId, 'scenes');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(scenePath(projectsRoot, projectId, fragment.number), fragment.html);
}

export async function loadSceneFragment(projectsRoot: string, projectId: string, sceneNum: number): Promise<string | null> {
  try {
    return await fs.readFile(scenePath(projectsRoot, projectId, sceneNum), 'utf8');
  } catch { return null; }
}

export interface PipelineJob {
  id: string;
  projectId: string;
  brief: string;
  status: 'scripting' | 'rendering_scenes' | 'assembling' | 'done' | 'failed';
  script?: Storyboard;
  scenes: SceneFragment[];
  outputMp4?: string;
  error?: string;
}

export interface Storyboard {
  title: string;
  duration: number;
  scenes: StoryboardScene[];
}

export interface StoryboardScene {
  number: number;
  title: string;
  duration: number;
  description: string;
  elements: string[];
}

export interface SceneFragment {
  number: number;
  html: string;
  duration: number;
}

/**
 * Stage 1 prompt — compact, focused only on storyboard generation.
 * Agent receives: brief + motion system tokens + script system summary.
 */
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
  "scenes": [
    {
      "number": 1,
      "title": "Scene Title",
      "duration": 8,
      "description": "What happens in this scene",
      "elements": ["element 1", "element 2", "element 3"]
    }
  ]
}

Rules:
- Total duration should match brief (or default to 30s)
- 4-6 scenes for a standard video
- Each scene 5-10 seconds
- Scene titles should be short (2-5 words)
- Elements should be specific visual items (headline, subhead, badge, chart, etc.)`;
}

/**
 * Stage 2 prompt — compact, focused on ONE scene only.
 * Agent receives: the full storyboard + the specific scene to render.
 */
export function buildScenePrompt(
  scene: StoryboardScene,
  storyboard: Storyboard,
  motionTokens: string,
  previousScenes: SceneFragment[],
): string {
  const prevInfo = previousScenes.length > 0
    ? `Previous scenes (use same palette, fonts, transition style):\nScene ${previousScenes.map(s => s.number).join(', ')} already done.`
    : 'This is the first scene.';

  return `You are a motion designer. Create ONE scene for a HyperFrames composition.

STORYBOARD: "${storyboard.title}", ${storyboard.duration}s total, scene ${scene.number}/${storyboard.scenes.length}

THIS SCENE:
- Number: ${scene.number}
- Title: ${scene.title}
- Duration: ${scene.duration}s
- Description: ${scene.description}
- Elements: ${scene.elements.join(', ')}

${prevInfo}

VISUAL STYLE: ${motionTokens}

CRITICAL RULES:
- class="clip" on ALL timed elements
- data-start + data-duration on every element
- NO transitions needed (assembly handles scene switching)
- Window.__timelines["scene${scene.number}"] = gsap.timeline({paused:true})
- Body: width:1920px; height:1080px; overflow:hidden
- Meta viewport: width=1920,height=1080
- Use the exact palette, fonts, and easing from VISUAL STYLE

Return ONLY the HTML for this scene (the <div class="scene"> and its contents + <style> + <script>).
Do NOT include <!DOCTYPE>, <html>, or <body> tags. Just the scene div and its assets.`;
}

/**
 * Stage 3 — no agent needed. Pure code: assemble fragments into a full
 * HyperFrames composition and render to MP4.
 */
export function assembleComposition(
  job: PipelineJob,
  motionTokens: string,
  musicTrack?: string,
): string {
  const scenes = job.scenes.sort((a, b) => a.number - b.number);
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const palette = extractPalette(motionTokens);
  const fonts = extractFonts(motionTokens);

  const sceneDivs = scenes.map((s, i) => `
    <!-- Scene ${s.number}: ${job.script?.scenes.find(sc => sc.number === s.number)?.title || ''} -->
    <div class="scene" data-scene="${s.number}" ${i === 0 ? 'style="opacity:1"' : 'style="opacity:0"'}>
      <div class="scene-content">
        ${s.html}
      </div>
    </div>`).join('\n');

  const timelineJs = scenes.map((s, i) => {
    const startTime = scenes.slice(0, i).reduce((sum, prev) => sum + prev.duration, 0);
    const endTime = startTime + s.duration;
    
    if (i < scenes.length - 1) {
      return `  // Scene ${s.number} → ${scenes[i+1].number} transition
  tl.to(zoom, { x: -60, opacity: 0.4, duration: 0.5, ease: "power2.inOut" }, ${endTime - 0.5});
  tl.call(() => {
    document.querySelector('[data-scene="${s.number}"]').style.opacity = "0";
    document.querySelector('[data-scene="${scenes[i+1].number}"]').style.opacity = "1";
  }, [], ${endTime - 0.3});
  tl.to(zoom, { x: 0, opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${endTime - 0.3});`;
    }
    return `  // Final scene ${s.number} — fade out
  tl.to(zoom, { opacity: 0, duration: 0.8, ease: "power2.in" }, ${endTime - 1});`;
  }).join('\n');

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
  #stage-zoom-container { width:100%; height:100%; }
  .scene { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; opacity:0; }
  .scene:first-child { opacity:1; }
  .scene-content { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:120px 160px; gap:16px; box-sizing:border-box; }
  .clip { visibility:hidden; }
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
<div id="stage" data-composition-id="pipeline" data-start="0" data-duration="${totalDuration}" data-width="1920" data-height="1080">
<div id="stage-zoom-container">
  ${audioTag}
  ${sceneDivs}
</div>
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  const zoom = document.getElementById("stage-zoom-container");
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

export function extractSceneHtml(text: string): string | null {
  // Try finding the scene-content div
  const contentMatch = text.match(/<div class="scene-content"[\s\S]*?<\/div>\s*<\/div>/i);
  if (contentMatch) return contentMatch[0];

  // Try finding any div block with style and script
  const divMatch = text.match(/(<div[\s\S]*?<\/div>\s*<script[\s\S]*?<\/script>)/i);
  if (divMatch) return divMatch[1];

  // Try markdown code fence extraction
  const fenceMatch = text.match(/```html\n([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1];

  // Last resort: any substantial HTML block
  const htmlMatch = text.match(/(<div[\s\S]{200,}?<\/div>)/i);
  return htmlMatch?.[1] || null;
}
