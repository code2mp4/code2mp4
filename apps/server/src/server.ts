/**
 * Open Video Server — full stack with SQLite, agents, files, templates, previews.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { composeVideoSystemPrompt } from './prompts/system.js';
import { listMotionSystems, readMotionSystem } from './motion-systems.js';
import { generateMotionPreviewHtml } from './motion-preview.js';
import { listVideoSkillDirs, listVideoSkills, readVideoSkill } from './video-skills-loader.js';
import { detectAgents, getAgentDef } from './agents.js';
import { createRunManager, createSseClient } from './runs.js';
import { startAgentRun } from './agent-runner.js';
import { openDatabase } from './db.js';
import * as DB from './db.js';
import * as FILES from './projects.js';
import {
  checkHyperframesAvailable,
  checkSystemRequirements,
  lintComposition,
  renderComposition,
  validateComposition,
  inspectComposition,
  generateTts,
  generateTranscribe,
  generateRemoveBackground,
  initProject,
  previewProject,
  runDoctor,
} from './renderer/hyperframes-bridge.js';
import { handleMediaGenerate, handleMediaWait, cleanupMediaTasks } from './media.js';
import { listMusic, readMusicFile } from './music-library.js';
import { listScriptSystems, readScriptSystem } from './script-systems.js';
import { buildDirectorPrompt, buildScenePrompt, assembleComposition, extractSceneHtml, parseStoryboard, type PipelineJob, loadPipelineJob, savePipelineJob, saveStoryboard, saveSceneFragment, loadSceneFragment, type Storyboard } from './pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const MOTION_SYSTEMS_DIR = path.join(PROJECT_ROOT, 'motion-systems');
const VIDEO_SKILLS_DIR = path.join(PROJECT_ROOT, 'video-skills');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects');
const SCRIPT_SYSTEMS_DIR = path.join(PROJECT_ROOT, 'script-systems');
const WEB_DIST = path.join(PROJECT_ROOT, 'apps', 'web', 'out');

export { composeVideoSystemPrompt };

interface ProjectDto {
  id: string;
  name: string;
  config: Record<string, unknown>;
  skillId: string | null;
  motionSystemId: string | null;
  createdAt: number;
  updatedAt: number;
}

export function parseProjectConfig(configJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(configJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function projectDto(project: DB.DbProject): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    config: parseProjectConfig(project.configJson),
    skillId: project.skillId,
    motionSystemId: project.motionSystemId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function createServer(): Promise<express.Express> {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // ── Persistence ───────────────────────────────────────────────────
  const db = openDatabase(PROJECT_ROOT);
  const runManager = createRunManager();
  const { agents, defaultAgentId } = await detectAgents();

  // Ensure project dirs
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });

  const skillDirs = await listVideoSkillDirs(VIDEO_SKILLS_DIR);
  const extraAllowedDirs = [MOTION_SYSTEMS_DIR, SCRIPT_SYSTEMS_DIR, TEMPLATES_DIR, ...skillDirs].filter(fs.existsSync);
  // Track agent runs per project
  const projectRuns = new Map<string, string>();

  console.log(
    `Agents: ${agents.filter(a => a.detected).map(a => a.name).join(', ')} | DB: ${PROJECT_ROOT}/.ov/app.sqlite`,
  );

  // ── Health ────────────────────────────────────────────────────────
  app.get('/api/health', async (_req, res) => {
    const sys = await checkSystemRequirements();
    res.json({
      status: 'ok', name: 'code2mp4', version: '0.1.0',
      system: sys, detectedAgents: agents.filter(a => a.detected).length,
      dbProjects: DB.listProjects(db).length,
    });
  });

  // ── Agents ────────────────────────────────────────────────────────
  app.get('/api/agents', (_req, res) => {
    res.json({
      agents: agents.map(a => ({
        id: a.id, name: a.name, detected: a.detected, version: a.version, models: a.models,
      })),
      defaultAgentId,
    });
  });

  // ── Motion systems ────────────────────────────────────────────────
  app.get('/api/motion-systems', async (_req, res) => {
    const systems = await listMotionSystems(MOTION_SYSTEMS_DIR);
    res.json(systems.map(s => ({
      id: s.id, title: s.title, category: s.category, summary: s.summary, energy: s.energy, swatches: s.swatches,
    })));
  });

  app.get('/api/motion-systems/:id', async (req, res) => {
    const body = await readMotionSystem(MOTION_SYSTEMS_DIR, req.params.id);
    if (!body) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: req.params.id, body });
  });

  // Motion system preview (generates sample HF HTML)
  app.get('/api/motion-systems/:id/preview', async (req, res) => {
    const systems = await listMotionSystems(MOTION_SYSTEMS_DIR);
    const system = systems.find(s => s.id === req.params.id);
    if (!system) { res.status(404).json({ error: 'Not found' }); return; }
    // Ensure full body is loaded
    const fullBody = await readMotionSystem(MOTION_SYSTEMS_DIR, req.params.id);
    const sys = fullBody ? { ...system, body: fullBody } : system;
    const html = generateMotionPreviewHtml(sys);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // ── Skills ────────────────────────────────────────────────────────
  app.get('/api/skills', async (_req, res) => {
    const skills = await listVideoSkills(VIDEO_SKILLS_DIR);
    res.json(skills.map(s => ({
      id: s.id, name: s.name, description: s.description,
      mode: s.mode, surface: s.surface, scenario: s.scenario,
    })));
  });

  app.get('/api/skills/:id', async (req, res) => {
    const skill = await readVideoSkill(VIDEO_SKILLS_DIR, req.params.id);
    if (!skill) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: skill.id, name: skill.name, description: skill.description, body: skill.body, dir: skill.dir });
  });

  // ── Templates ─────────────────────────────────────────────────────
  app.get('/api/templates', async (_req, res) => {
    try {
      const entries = await fs.promises.readdir(TEMPLATES_DIR, { withFileTypes: true });
      const templates = entries
        .filter(e => e.isFile() && e.name.endsWith('.html'))
        .map(e => ({
          id: e.name.replace('.html', ''),
          name: e.name.replace('.html', '').replace(/-/g, ' '),
          path: path.join(TEMPLATES_DIR, e.name),
        }));
      res.json(templates);
    } catch {
      res.json([]);
    }
  });

  app.get('/api/templates/:id', async (req, res) => {
    const filePath = path.join(TEMPLATES_DIR, `${req.params.id}.html`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      res.json({ id: req.params.id, content });
    } catch {
      res.status(404).json({ error: 'Template not found' });
    }
  });

  // ── Music library ──────────────────────────────────────────────────
  const MUSIC_DIR = path.join(PROJECT_ROOT, 'music');

  app.get('/api/music', async (req, res) => {
    try {
      const tracks = await listMusic(MUSIC_DIR);
      const { style, mood } = req.query;
      let filtered = tracks;
      if (typeof style === 'string') filtered = filtered.filter(t => t.style === style);
      if (typeof mood === 'string') filtered = filtered.filter(t => t.mood === mood);
      res.json(filtered.map(t => ({
        id: t.id, title: t.title, style: t.style, mood: t.mood,
        bpm: t.bpm, durationSec: t.durationSec, license: t.license,
        attribution: t.attribution, tags: t.tags, size: t.size,
      })));
    } catch {
      res.json([]);
    }
  });

  app.get('/api/music/:id/play', async (req, res) => {
    const result = await readMusicFile(MUSIC_DIR, req.params.id);
    if (!result) { res.status(404).json({ error: 'Track not found' }); return; }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', result.track.size);
    res.send(result.buffer);
  });

  // ── Script systems ─────────────────────────────────────────────────

  app.get('/api/script-systems', async (_req, res) => {
    try {
      const systems = await listScriptSystems(SCRIPT_SYSTEMS_DIR);
      res.json(systems.map(s => ({
        id: s.id, title: s.title, category: s.category, summary: s.summary,
        duration: s.duration, scenes: s.scenes,
      })));
    } catch { res.json([]); }
  });

  app.get('/api/script-systems/:id', async (req, res) => {
    const body = await readScriptSystem(SCRIPT_SYSTEMS_DIR, req.params.id);
    if (!body) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: req.params.id, body });
  });

  // ── Projects (SQLite-backed) ──────────────────────────────────────
  app.post('/api/projects', (req, res) => {
    try {
      const project = DB.insertProject(db, {
        name: req.body.name ?? 'Untitled Video',
        config: req.body.config ?? {},
        skillId: req.body.skillId ?? null,
        motionSystemId: req.body.motionSystemId ?? null,
      });
      FILES.ensureProjectDir(PROJECTS_DIR, project.id);
      res.json(projectDto(project));
    } catch (err) {
      res.status(500).json({ error: 'Failed to create project', detail: String(err) });
    }
  });

  app.get('/api/projects', (_req, res) => {
    res.json(DB.listProjects(db).map(projectDto));
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = DB.getProject(db, req.params.id);
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(projectDto(project));
  });

  app.patch('/api/projects/:id', (req, res) => {
    const updated = DB.updateProject(db, req.params.id, {
      name: req.body.name,
      config: req.body.config,
      skillId: req.body.skillId,
      motionSystemId: req.body.motionSystemId,
    });
    if (!updated) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(projectDto(updated));
  });

  app.delete('/api/projects/:id', (req, res) => {
    FILES.removeProjectDir(PROJECTS_DIR, req.params.id).catch(() => {});
    const deleted = DB.deleteProject(db, req.params.id);
    res.json({ deleted });
  });

  // ── Project files ─────────────────────────────────────────────────
  app.get('/api/projects/:id/files', async (req, res) => {
    try {
      const files = await FILES.listProjectFiles(PROJECTS_DIR, req.params.id);
      res.json(files);
    } catch {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  app.get('/api/projects/:id/files/:fileName', async (req, res) => {
    const params = req.params as Record<string, string>;
    const fileName = params['fileName'] || '';
    try {
      const content = await FILES.readProjectFile(PROJECTS_DIR, req.params.id, fileName);
      if (!content) { res.status(404).json({ error: 'File not found' }); return; }
      const file = await FILES.listProjectFiles(PROJECTS_DIR, req.params.id)
        .then(files => files.find(f => f.path === fileName));
      res.setHeader('Content-Type', file?.mime ?? 'application/octet-stream');
      res.send(content);
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  });

  app.post('/api/projects/:id/files/:fileName', async (req, res) => {
    const params = req.params as Record<string, string>;
    const fileName = params['fileName'] || '';
    try {
      const content = req.body.content ?? req.body;
      await FILES.writeProjectFile(PROJECTS_DIR, req.params.id, fileName, content);
      res.json({ written: fileName });
    } catch (err) {
      res.status(400).json({ error: 'Failed to write file', detail: String(err) });
    }
  });

  app.delete('/api/projects/:id/files/:fileName', async (req, res) => {
    const params = req.params as Record<string, string>;
    const fileName = params['fileName'] || '';
    const deleted = await FILES.deleteProjectFile(PROJECTS_DIR, req.params.id, fileName);
    res.json({ deleted });
  });

  // ── Conversations ─────────────────────────────────────────────────
  app.post('/api/conversations', (req, res) => {
    try {
      const conv = DB.insertConversation(db, {
        projectId: req.body.projectId,
        title: req.body.title,
      });
      res.json(conv);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/projects/:id/conversations', (req, res) => {
    res.json(DB.listConversations(db, req.params.id));
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    res.json(DB.listMessages(db, req.params.id));
  });

  app.delete('/api/conversations/:id', (req, res) => {
    const deleted = DB.deleteConversation(db, req.params.id);
    res.json({ deleted });
  });

  // ── Agent runs (with conversation persistence) ────────────────────
  app.post('/api/runs', async (req, res) => {
    try {
      const { prompt, projectId, conversationId, agentId: requestedAgentId, motionSystemId, scriptSystemId, skillId } = req.body;
      if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }

      const agentId = requestedAgentId ?? defaultAgentId;
      if (!agentId) {
        res.status(400).json({ error: 'No AI agent detected. Install Claude Code, OpenCode, Codex CLI, or Gemini CLI.' });
        return;
      }
      const agent = getAgentDef(agents, agentId);
      if (!agent) { res.status(400).json({ error: `Agent "${agentId}" not found` }); return; }

      // Resolve conversation
      let convId = conversationId;
      if (!convId && projectId) {
        const convs = DB.listConversations(db, projectId);
        convId = convs[0]?.id ?? null;
      }
      if (!convId && projectId) {
        const conv = DB.insertConversation(db, { projectId });
        convId = conv.id;
      }
      if (!convId) {
        // Create a temporary conversation for the run
        if (projectId) {
          const conv = DB.insertConversation(db, { projectId, title: prompt.slice(0, 80) });
          convId = conv.id;
        }
      }

      // Save user message
      if (convId) {
        DB.insertMessage(db, { conversationId: convId, role: 'user', content: prompt });
      }

      // Compose system prompt
      let motionBody: string | undefined;
      let scriptBody: string | undefined;
      let skillBody: string | undefined;
      let skillName: string | undefined;

      if (motionSystemId) {
        motionBody = await readMotionSystem(MOTION_SYSTEMS_DIR, motionSystemId) ?? undefined;
      }
      if (scriptSystemId) {
        const fullBody = await readScriptSystem(SCRIPT_SYSTEMS_DIR, scriptSystemId);
        if (fullBody) {
          // Extract compact summary (from the `> Summary:` field in frontmatter)
          const summaryMatch = fullBody.match(/^>\s*Summary:\s*(.+?)\s*$/m);
          scriptBody = summaryMatch?.[1] ?? fullBody.slice(0, 500);
        }
      }
      if (skillId) {
        const skill = await readVideoSkill(VIDEO_SKILLS_DIR, skillId);
        if (skill) { skillBody = skill.body; skillName = skill.name; }
      }

      const project = projectId ? DB.getProject(db, projectId) : null;
      const config = project ? JSON.parse(project.configJson) : {};

      const systemPrompt = composeVideoSystemPrompt({
        skillBody,
        skillName,
        motionSystemBody: motionBody,
        motionSystemTitle: motionSystemId,
        scriptSystemBody: scriptBody,
        scriptSystemTitle: scriptSystemId,
        metadata: config,
      });

      // Create run
      const cwd = projectId
        ? await FILES.ensureProjectDir(PROJECTS_DIR, projectId)
        : PROJECT_ROOT;

      const run = runManager.create({ projectId, agentId });
      if (projectId) projectRuns.set(projectId, run.id);

      // Save assistant message placeholder
      let assistantMsgId: string | null = null;
      if (convId) {
        const msg = DB.insertMessage(db, {
          conversationId: convId, role: 'assistant', content: '',
          agentId: agent.id, agentName: agent.name,
        });
        assistantMsgId = msg.id;
      }

      // Start agent with output persistence
      startAgentRun({
        run, agent,
        userMessage: prompt,
        systemPrompt, cwd,
        manager: runManager,
        projectId: projectId ?? undefined,
        extraAllowedDirs,
        onComplete: (accumulatedText: string) => {
          // Persist agent output to message
          if (convId && assistantMsgId) {
            DB.updateMessageContent(db, assistantMsgId, accumulatedText);
          }
        },
      }).catch(err => console.error('Agent run failed:', err));

      // Store assistant message ID for updates via SSE replay
      const runMeta = run as unknown as { _assistantMsgId?: string };
      if (assistantMsgId) (runMeta as Record<string, unknown>)._assistantMsgId = assistantMsgId;

      res.json({
        runId: run.id, status: 'queued', projectId: run.projectId, agentId: run.agentId,
        conversationId: convId, assistantMessageId: assistantMsgId,
      });
    } catch (err) {
      console.error('Failed to create run:', err);
      res.status(500).json({ error: 'Failed to create run', detail: String(err) });
    }
  });

  // SSE: subscribe to run events
  app.get('/api/runs/:id/events', (req, res) => {
    const run = runManager.get(req.params.id);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }

    const afterEventId = req.query.after ? parseInt(String(req.query.after), 10) : 0;
    const client = createSseClient(res);
    runManager.attachClient(req.params.id, client, afterEventId);

    req.on('close', () => client.end());
  });

  // Cancel a run
  app.post('/api/runs/:id/cancel', (req, res) => {
    const cancelled = runManager.cancel(req.params.id);
    res.json({ cancelled });
  });

  // List active runs
  app.get('/api/runs', (_req, res) => {
    res.json(runManager.list().map(r => ({
      id: r.id, projectId: r.projectId, agentId: r.agentId, status: r.status,
      createdAt: r.createdAt, exitCode: r.exitCode,
    })));
  });

  // ── HyperFrames operations ────────────────────────────────────────
  app.post('/api/hf/lint', async (req, res) => {
    const { compositionDir } = req.body;
    if (!compositionDir) { res.status(400).json({ error: 'compositionDir required' }); return; }
    res.json(await lintComposition(compositionDir));
  });

  app.post('/api/hf/validate', async (req, res) => {
    const { compositionDir } = req.body;
    if (!compositionDir) { res.status(400).json({ error: 'compositionDir required' }); return; }
    res.json(await validateComposition(compositionDir));
  });

  app.post('/api/hf/inspect', async (req, res) => {
    const { compositionDir } = req.body;
    if (!compositionDir) { res.status(400).json({ error: 'compositionDir required' }); return; }
    res.json(await inspectComposition(compositionDir));
  });

  app.post('/api/hf/render', async (req, res) => {
    const { compositionDir, outputPath, quality, fps } = req.body;
    if (!compositionDir || !outputPath) { res.status(400).json({ error: 'compositionDir and outputPath required' }); return; }
    try {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      const result = await renderComposition(compositionDir, { outputPath, quality, fps }, ev => res.write(`data: ${JSON.stringify(ev)}\n\n`));
      res.write(`data: ${JSON.stringify(result)}\n\n`);
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`);
      res.end();
    }
  });

  app.get('/api/hf/check', async (_req, res) => {
    res.json({ available: await checkHyperframesAvailable(), ...(await checkSystemRequirements()) });
  });

  // ── Media generation (agent-dispatched via C2M CLI) ────────────────
  app.post('/api/media/generate', async (req, res) => {
    await handleMediaGenerate(req, res);
  });

  app.get('/api/media/wait/:taskId', async (req, res) => {
    await handleMediaWait(
      { params: { taskId: req.params.taskId }, query: req.query as { since?: string }, on: req.on.bind(req) },
      res,
    );
  });

  // Periodic cleanup of old runs and media tasks
  setInterval(() => {
    runManager.cleanup();
    cleanupMediaTasks();
  }, 5 * 60 * 1000).unref(); // every 5 minutes

  // ── Multi-stage pipeline ───────────────────────────────────────────

  // Stage 1: Director — generate storyboard
  app.post('/api/pipeline/storyboard', async (req, res) => {
    const { brief, projectId, motionSystemId, scriptSystemId, agentId: reqAgentId } = req.body;
    if (!brief || !projectId) { res.status(400).json({ error: 'brief and projectId required' }); return; }

    let motionTokens = 'Canvas: #0D1117, Accent: #58A6FF, Display: JetBrains Mono, mono';
    if (motionSystemId) {
      const body = await readMotionSystem(MOTION_SYSTEMS_DIR, motionSystemId);
      if (body) motionTokens = body.slice(0, 500);
    }

    const directorPrompt = buildDirectorPrompt(brief, motionTokens, '');
    const agId = reqAgentId || defaultAgentId || 'claude';
    const agent = getAgentDef(agents, agId);
    if (!agent) { res.status(400).json({ error: 'No agent' }); return; }

    const jobId = randomUUID();
    const job: PipelineJob = { id: jobId, projectId, brief, status: 'scripting', scenes: [], sceneRunIds: [] };
    await savePipelineJob(PROJECTS_DIR, job);

    const conv = DB.insertConversation(db, { projectId, title: brief.slice(0, 80) });
    DB.insertMessage(db, { conversationId: conv.id, role: 'user', content: directorPrompt });

    const cwd = await FILES.ensureProjectDir(PROJECTS_DIR, projectId);
    const run = runManager.create({ projectId, agentId: agId });
    const asstMsg = DB.insertMessage(db, { conversationId: conv.id, role: 'assistant', content: '', agentId: agent.id, agentName: agent.name });

    startAgentRun({
      run, agent, userMessage: directorPrompt, systemPrompt: '', cwd, manager: runManager,
      projectId, extraAllowedDirs,
      onComplete: async (text) => {
        DB.updateMessageContent(db, asstMsg.id, text);
        const script = parseStoryboard(text);
        if (script) {
          await saveStoryboard(PROJECTS_DIR, jobId, script);
          job.script = script;
          job.status = 'rendering_scenes';
        } else { job.status = 'failed'; job.error = 'No storyboard JSON in output'; }
        await savePipelineJob(PROJECTS_DIR, job);
      },
    }).catch(async () => { job.status = 'failed'; await savePipelineJob(PROJECTS_DIR, job); });

    res.json({ jobId, runId: run.id, status: 'scripting', conversationId: conv.id });
  });

  // Stage 2: Run scene agents (sequential, with retry support)
  app.post('/api/pipeline/:jobId/scenes', async (req, res) => {
    const job = await loadPipelineJob(PROJECTS_DIR, req.params.jobId);
    if (!job || !job.script) { res.status(404).json({ error: 'Job not found or no script' }); return; }

    const { agentId: reqAgentId } = req.body;
    const agId = reqAgentId || defaultAgentId || 'claude';
    const agent = getAgentDef(agents, agId);
    if (!agent) { res.status(400).json({ error: 'No agent' }); return; }

    const cwd = await FILES.ensureProjectDir(PROJECTS_DIR, job.projectId);
    const motionTokens = 'Canvas: #0D1117, Accent: #58A6FF, Display: JetBrains Mono';

    // Only process pending scenes (skip already done)
    const pendingScenes = job.script.scenes.filter(
      sc => !job.scenes.find(s => s.number === sc.number && s.status === 'done')
    );

    if (pendingScenes.length === 0) {
      res.json({ message: 'All scenes already complete', totalScenes: job.script.scenes.length });
      return;
    }

    res.json({ message: `Starting ${pendingScenes.length} scenes`, totalScenes: job.script.scenes.length });

    // Process scenes sequentially (one at a time for reliability)
    for (const sc of pendingScenes) {
      const existing = job.scenes.find(s => s.number === sc.number);
      if (existing) existing.status = 'running';
      else job.scenes.push({ number: sc.number, html: '', duration: sc.duration, status: 'running' });
      await savePipelineJob(PROJECTS_DIR, job);

      const scenePrompt = buildScenePrompt(sc, job.script, motionTokens, job.scenes);
      const conv = DB.insertConversation(db, { projectId: job.projectId, title: `Scene ${sc.number}` });
      DB.insertMessage(db, { conversationId: conv.id, role: 'user', content: scenePrompt });
      const run = runManager.create({ projectId: job.projectId, agentId: agId });
      const asstMsg = DB.insertMessage(db, { conversationId: conv.id, role: 'assistant', content: '', agentId: agent.id, agentName: agent.name });
      const jid = job.id;

      await new Promise<void>((resolve) => {
        startAgentRun({
          run, agent, userMessage: scenePrompt, systemPrompt: '', cwd, manager: runManager,
          projectId: job.projectId,
          onComplete: async (text) => {
            DB.updateMessageContent(db, asstMsg.id, text);
            const html = extractSceneHtml(text);
            const reloaded = await loadPipelineJob(PROJECTS_DIR, jid);
            if (!reloaded) { resolve(); return; }

            const frag = reloaded.scenes.find(s => s.number === sc.number);
            if (frag) {
              if (html) {
                frag.html = html;
                frag.status = 'done';
                await saveSceneFragment(PROJECTS_DIR, jid, { number: sc.number, html, duration: sc.duration, status: 'done' });
              } else {
                frag.status = 'failed';
                frag.error = 'Could not extract HTML from agent output';
              }
            }
            await savePipelineJob(PROJECTS_DIR, reloaded);

            // Check if all done
            const allDone = reloaded.scenes.length === reloaded.script!.scenes.length &&
              reloaded.scenes.every(s => s.status === 'done');
            if (allDone) await assembleAndRender(reloaded, motionTokens);

            resolve();
          },
        }).catch(async () => {
          const reloaded = await loadPipelineJob(PROJECTS_DIR, jid);
          if (reloaded) {
            const frag = reloaded.scenes.find(s => s.number === sc.number);
            if (frag) { frag.status = 'failed'; frag.error = 'Agent process error'; }
            await savePipelineJob(PROJECTS_DIR, reloaded);
          }
          resolve();
        });
      });
    }
  });

  // Scene retry — retry a single failed scene
  app.post('/api/pipeline/:jobId/scene/:num/retry', async (req, res) => {
    const job = await loadPipelineJob(PROJECTS_DIR, req.params.jobId);
    if (!job || !job.script) { res.status(404).json({ error: 'Job not found' }); return; }

    const num = parseInt(req.params.num, 10);
    const sc = job.script.scenes.find(s => s.number === num);
    if (!sc) { res.status(404).json({ error: 'Scene not found in storyboard' }); return; }

    const { agentId: reqAgentId } = req.body;
    const agId = reqAgentId || defaultAgentId || 'claude';
    const agent = getAgentDef(agents, agId);
    if (!agent) { res.status(400).json({ error: 'No agent' }); return; }

    const cwd = await FILES.ensureProjectDir(PROJECTS_DIR, job.projectId);
    const motionTokens = 'Canvas: #0D1117, Accent: #58A6FF, Display: JetBrains Mono';

    // Mark as running
    const frag = job.scenes.find(s => s.number === num);
    if (frag) frag.status = 'running';
    else job.scenes.push({ number: num, html: '', duration: sc.duration, status: 'running' });
    await savePipelineJob(PROJECTS_DIR, job);

    const scenePrompt = buildScenePrompt(sc, job.script, motionTokens, job.scenes);
    const conv = DB.insertConversation(db, { projectId: job.projectId, title: `Scene ${num} retry` });
    const run = runManager.create({ projectId: job.projectId, agentId: agId });
    const jid = job.id;

    startAgentRun({
      run, agent, userMessage: scenePrompt, systemPrompt: '', cwd, manager: runManager,
      projectId: job.projectId,
      onComplete: async (text) => {
        const html = extractSceneHtml(text);
        const reloaded = await loadPipelineJob(PROJECTS_DIR, jid);
        if (!reloaded) return;
        const f = reloaded.scenes.find(s => s.number === num);
        if (f) {
          f.status = html ? 'done' : 'failed';
          if (html) { f.html = html; await saveSceneFragment(PROJECTS_DIR, jid, { number: num, html, duration: sc.duration, status: 'done' }); }
        }
        await savePipelineJob(PROJECTS_DIR, reloaded);
        const allDone = reloaded.scenes.length === reloaded.script!.scenes.length &&
          reloaded.scenes.every(s => s.status === 'done');
        if (allDone) await assembleAndRender(reloaded, motionTokens);
      },
    }).catch(() => {});

    res.json({ sceneNum: num, runId: run.id, status: 'retrying' });
  });

  // Stage 3: Manual or partial assembly
  app.post('/api/pipeline/:jobId/assemble', async (_req, res) => {
    const job = await loadPipelineJob(PROJECTS_DIR, _req.params.jobId);
    if (!job || !job.script) { res.status(400).json({ error: 'Job not ready' }); return; }
    const doneScenes = job.scenes.filter(s => s.status === 'done');
    if (doneScenes.length === 0) { res.status(400).json({ error: 'No completed scenes' }); return; }
    const motionTokens = 'Canvas: #0D1117, Accent: #58A6FF, Display: JetBrains Mono';
    await assembleAndRender(job, motionTokens);
    await savePipelineJob(PROJECTS_DIR, job);
    res.json({ jobId: job.id, status: job.status, outputMp4: job.outputMp4, scenesUsed: doneScenes.length });
  });

  // Get pipeline job status
  app.get('/api/pipeline/:jobId', async (req, res) => {
    const job = await loadPipelineJob(PROJECTS_DIR, req.params.jobId);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json({
      id: job.id, status: job.status,
      scenesCompleted: job.scenes.filter(s => s.status === 'done').length,
      totalScenes: job.script?.scenes.length || 0,
      scenes: job.scenes.map(s => ({ number: s.number, status: s.status, error: s.error })),
      script: job.script,
      outputMp4: job.outputMp4,
      error: job.error,
    });
  });

  // Helper: assemble and render
  async function assembleAndRender(job: PipelineJob, motionTokens: string) {
    try {
      job.status = 'assembling';
      await savePipelineJob(PROJECTS_DIR, job);

      const html = assembleComposition(job, motionTokens, '../../../music/corporate-upbeat.wav');
      const compDir = path.join(PROJECTS_DIR, job.projectId, '.hf-cache', 'pipeline');
      await fs.promises.mkdir(compDir, { recursive: true });
      await fs.promises.writeFile(path.join(compDir, 'index.html'), html);

      const outputPath = path.join(PROJECTS_DIR, job.projectId, 'output.mp4');
      const { spawn } = await import('node:child_process');
      return new Promise<void>((resolve) => {
        const child = spawn('npx', ['hyperframes', 'render', '--format', 'mp4', '--quality', 'standard', '--fps', '30', '--output', outputPath, '--composition-dir', compDir], { stdio: 'ignore' });
        child.on('close', async (code) => {
          if (code === 0) {
            job.status = 'done';
            job.outputMp4 = outputPath;
          } else {
            job.status = 'failed';
            job.error = `Render exit code: ${code}`;
          }
          await savePipelineJob(PROJECTS_DIR, job);
          resolve();
        });
      });
    } catch (err) {
      job.status = 'failed';
      job.error = String(err);
      await savePipelineJob(PROJECTS_DIR, job);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // IMPORTANT: Pipeline routes must be registered BEFORE the catch-all
  // SPA fallback route. Do not add routes after app.get('/{*splat}')
  // ══════════════════════════════════════════════════════════════════

  // ── Serve static web app ──────────────────────────────────────────
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  }

  return app;
}

export async function startServer(port = 7456) {
  const app = await createServer();
  return new Promise<void>(resolve => app.listen(port, () => {
    console.log(`Open Video server → http://localhost:${port}`);
    resolve();
  }));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
