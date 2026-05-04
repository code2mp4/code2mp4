/**
 * Open Video Server — full stack with SQLite, agents, files, templates, previews.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
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
} from './renderer/hyperframes-bridge.js';
import { handleMediaGenerate, handleMediaWait, cleanupMediaTasks } from './media.js';
import { listMusic, readMusicFile } from './music-library.js';
import { listScriptSystems, readScriptSystem } from './script-systems.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const MOTION_SYSTEMS_DIR = path.join(PROJECT_ROOT, 'motion-systems');
const VIDEO_SKILLS_DIR = path.join(PROJECT_ROOT, 'video-skills');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects');
const WEB_DIST = path.join(PROJECT_ROOT, 'apps', 'web', 'out');

export { composeVideoSystemPrompt };

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
  const extraAllowedDirs = [MOTION_SYSTEMS_DIR, TEMPLATES_DIR, ...skillDirs].filter(fs.existsSync);
  // Track agent runs per project
  const projectRuns = new Map<string, string>();

  console.log(
    `Agents: ${agents.filter(a => a.detected).map(a => a.name).join(', ')} | DB: ${PROJECT_ROOT}/.ov/app.sqlite`,
  );

  // ── Health ────────────────────────────────────────────────────────
  app.get('/api/health', async (_req, res) => {
    const sys = await checkSystemRequirements();
    res.json({
      status: 'ok', name: 'open-video', version: '0.1.0',
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
  const SCRIPT_SYSTEMS_DIR = path.join(PROJECT_ROOT, 'script-systems');

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
      res.json(project);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create project', detail: String(err) });
    }
  });

  app.get('/api/projects', (_req, res) => {
    res.json(DB.listProjects(db));
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = DB.getProject(db, req.params.id);
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(project);
  });

  app.patch('/api/projects/:id', (req, res) => {
    const updated = DB.updateProject(db, req.params.id, {
      name: req.body.name,
      config: req.body.config,
      skillId: req.body.skillId,
      motionSystemId: req.body.motionSystemId,
    });
    if (!updated) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(updated);
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
        scriptBody = await readScriptSystem(SCRIPT_SYSTEMS_DIR, scriptSystemId) ?? undefined;
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

      // Start agent
      startAgentRun({
        run, agent,
        userMessage: prompt,
        systemPrompt, cwd,
        manager: runManager,
        projectId: projectId ?? undefined,
        extraAllowedDirs,
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

  // ── Media generation (agent-dispatched via od CLI) ─────────────────
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
