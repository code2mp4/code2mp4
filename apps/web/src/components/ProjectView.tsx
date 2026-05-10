import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreview } from './video/VideoPreview';
import { FileWorkspace } from './FileWorkspace';
import { AgentPicker } from './AgentPicker';
import { AssistantMessage } from './AssistantMessage';
import { ChatComposer } from './ChatComposer';
import { useT } from '../i18n/context';

interface Message {
  id: string; role: 'user' | 'assistant' | 'system'; content: string;
}

interface Conversation { id: string; projectId: string; title: string | null; }

interface ToolCall { id: string; name: string; input: Record<string, unknown>; }

interface ProjectInfo {
  id: string;
  name: string;
  config?: Record<string, unknown>;
}

interface ProjectFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
  kind: 'html' | 'video' | 'image' | 'audio' | 'text' | 'other';
  mime: string;
}

interface Props {
  projectId: string; onBack: () => void;
  selectedAgentId: string | null; onSelectAgent: (id: string) => void;
  initialPrompt?: string;
  onInitialPromptConsumed?: () => void;
}

const HINT_PROMPTS = [
  'Product launch video — 15s, 16:9, tech style',
  'Social media reel — 8s, 9:16 vertical, fast cuts',
  'Brand intro animation — 5s, logo reveal, dark canvas',
  'Tutorial explainer — 60s, step-by-step, code blocks',
];

export function ProjectView({
  projectId, onBack, selectedAgentId, onSelectAgent, initialPrompt, onInitialPromptConsumed,
}: Props) {
  const { t } = useT();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [html, setHtml] = useState<string>();
  const [mp4, setMp4] = useState<string>();
  const [convId, setConvId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [showFiles, setShowFiles] = useState(true);
  const [filesVer, setFilesVer] = useState(0);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [statusLine, setStatusLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [convMenuOpen, setConvMenuOpen] = useState(false);
  const [agentName, setAgentName] = useState('Agent');
  const [elapsed, setElapsed] = useState(0);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);
  const initialPromptRef = useRef<string | null>(null);

  useEffect(() => { setError(null); loadConvs().catch(() => setError('Failed to load conversations')); }, [projectId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, toolCalls]);
  useEffect(() => { return () => esRef.current?.close(); }, []);
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(setProject)
      .catch(() => setProject(null));
  }, [projectId]);
  useEffect(() => {
    loadFiles();
    const iv = setInterval(loadFiles, 4000);
    return () => clearInterval(iv);
  }, [projectId, filesVer]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); send(); }
      if (e.key === 'Escape') { if (showFiles) setShowFiles(false); if (working && runIdRef.current) cancelRun(); }
      if (mod && e.key === 'b') { e.preventDefault(); setShowFiles(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFiles, working]);

  // Elapsed timer
  useEffect(() => {
    if (!working) return;
    const iv = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 1000);
    return () => clearInterval(iv);
  }, [working]);

  // Completion notification
  useEffect(() => {
    if (!working && msgs.length > 0 && statusLine === '') {
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant' && last.content) {
        // Desktop notification
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Open Video — Agent finished', { body: 'Your video is ready', icon: '/favicon.ico' });
        }
        // Request permission for next time
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    }
  }, [working, msgs.length]);

  // Reattach to running agent on page refresh
  useEffect(() => {
    fetch('/api/runs')
      .then(r => r.json())
      .then((runs: Array<{ id: string; projectId: string; status: string }>) => {
        const activeRun = runs.find(r => r.projectId === projectId && r.status === 'running');
        if (activeRun) {
          setWorking(true);
          startTimeRef.current = Date.now() - 5000; // approximate
          setStatusLine('Reconnecting to agent...');
          const aid = crypto.randomUUID();
          setMsgs(prev => [...prev, { id: aid, role: 'assistant', content: '' }]);
          connect(activeRun.id, aid);
        }
      })
      .catch(() => {});
  }, [projectId]);

  async function loadConvs() {
    const convs = await fetch(`/api/projects/${projectId}/conversations`).then(r => r.json());
    setConvs(convs);
    if (convs.length > 0) {
      setConvId(convs[0].id);
      const msgs = await fetch(`/api/conversations/${convs[0].id}/messages`).then(r => r.json());
      setMsgs(msgs.map((m: { id: string; role: string; content: string }) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
      })));
    }
  }

  async function switchConv(id: string) {
    setConvId(id); closeStream(); setError(null); setConvMenuOpen(false);
    try {
      const msgs = await fetch(`/api/conversations/${id}/messages`).then(r => r.json());
      setMsgs(msgs.map((m: { id: string; role: string; content: string }) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
      })));
    } catch { setMsgs([]); }
  }

  async function newConv() {
    const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, title: 'New chat' }) });
    const c = await res.json();
    setConvId(c.id); setConvs(prev => [c, ...prev]); setMsgs([]); setHtml(undefined); setMp4(undefined); setError(null); setConvMenuOpen(false);
  }

  const sendText = useCallback(async (text: string) => {
    const t = text.trim(); if (!t || working) return;
    setMsgs(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: t }]);
    setInput(''); setWorking(true); setError(null); setToolCalls([]); setStatusLine('Starting agent...');
    startTimeRef.current = Date.now(); setElapsed(0);
    const aid = crypto.randomUUID();
    setMsgs(prev => [...prev, { id: aid, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: t, projectId, conversationId: convId, agentId: selectedAgentId }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        updateMsg(aid, `Error: ${err.error || 'Agent not available'}\n\nInstall: \`npm i -g @anthropic-ai/claude-code\``);
        setError(err.error || 'Agent not available'); setWorking(false); return;
      }
      const { runId, conversationId: newConvId } = await res.json();
      runIdRef.current = runId;
      if (newConvId && !convId) { setConvId(newConvId); loadConvs(); }
      connect(runId, aid);
    } catch (e) {
      updateMsg(aid, `Network error: ${e instanceof Error ? e.message : 'Connection failed'}`);
      setError('Network error'); setWorking(false);
    }
  }, [working, projectId, convId, selectedAgentId]);

  const send = useCallback(() => {
    sendText(input);
  }, [input, sendText]);

  useEffect(() => {
    const prompt = initialPrompt?.trim();
    if (!prompt || working) return;
    const key = `${projectId}:${prompt}`;
    if (initialPromptRef.current === key) return;
    initialPromptRef.current = key;
    onInitialPromptConsumed?.();
    sendText(prompt);
  }, [initialPrompt, projectId, working, onInitialPromptConsumed, sendText]);

  function connect(runId: string, aid: string) {
    closeStream();
    const es = new EventSource(`/api/runs/${runId}/events`);
    esRef.current = es;
    let acc = '';
    let thinking = '';

    es.addEventListener('text', e => {
      const d = JSON.parse(e.data);
      acc += (d.content ?? '') + '\n';
      updateMsg(aid, acc);
      detectFileOps(d.content ?? '');
      detectHtmlArtifact(acc);
    });
    es.addEventListener('text_delta', e => {
      acc += JSON.parse(e.data).content ?? '';
      updateMsg(aid, acc);
      detectHtmlArtifact(acc);
    });
    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      if (d.status === 'init') { setAgentName(d.agent || 'Agent'); }
      else setStatusLine(d.label ?? d.status ?? '');
    });
    es.addEventListener('tool_use', e => {
      const d = JSON.parse(e.data);
      setToolCalls(prev => [...prev.slice(-49), { id: d.id, name: d.name, input: d.input || {} }]);
      setStatusLine(`🔧 ${d.name}`);
    });
    es.addEventListener('tool_result', e => {
      const d = JSON.parse(e.data);
      setToolCalls(prev => prev.map(tc => tc.id === d.tool_use_id ? { ...tc, result: { content: d.content, is_error: d.is_error } } : tc));
      setFilesVer(v => v + 1);
    });
    es.addEventListener('end', () => { setWorking(false); setStatusLine(''); closeStream(); extractHtml(acc); loadConvs(); setFilesVer(v => v + 1); });
    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) { setWorking(false); setStatusLine(''); updateMsg(aid, acc || 'Stream ended.'); extractHtml(acc); setFilesVer(v => v + 1); }
      else if (es.readyState === EventSource.CONNECTING) setStatusLine('Reconnecting...');
    });
  }

  function detectFileOps(content: string) {
    if (/wrote|writing|created/i.test(content)) setFilesVer(v => v + 1);
  }
  function detectHtmlArtifact(text: string) {
    const m = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i) || text.match(/(<!doctype html>[\s\S]*?<\/html>)/i);
    if (m?.[1]?.trim()) setHtml(m[1].trim());
  }
  function extractHtml(text: string) { detectHtmlArtifact(text); }
  function updateMsg(id: string, c: string) { setMsgs(prev => prev.map(m => m.id === id ? { ...m, content: c } : m)); }
  function closeStream() { esRef.current?.close(); esRef.current = null; }
  const cancelRun = useCallback(async () => {
    if (runIdRef.current) await fetch(`/api/runs/${runIdRef.current}/cancel`, { method: 'POST' }).catch(() => {});
    closeStream(); setWorking(false); setStatusLine('Cancelled'); setFilesVer(v => v + 1);
  }, []);

  const handleFileSelect = useCallback(async (file: { path: string; kind: string; mime: string }) => {
    if (file.kind === 'video') setMp4(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
    else if (file.kind === 'html') {
      const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
      setHtml(await res.text());
    }
  }, [projectId]);

  async function loadFiles() {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) setFiles(await res.json());
    } catch {}
  }

  const cfg = project?.config ?? {};
  const videoFiles = files.filter(f => f.kind === 'video');
  const htmlFiles = files.filter(f => f.kind === 'html');
  const storyboardFiles = files.filter(f => f.name.toLowerCase().includes('storyboard'));
  const activeOutput = mp4 ? 'Rendered MP4' : html ? 'Motion source' : working ? 'Agent running' : 'Awaiting source';
  const pipelineSteps = [
    { label: 'Brief', done: msgs.some(m => m.role === 'user') || Boolean(cfg.copy) },
    { label: 'Storyboard', done: storyboardFiles.length > 0 || /storyboard/i.test(msgs.map(m => m.content).join(' ')) },
    { label: 'Source', done: htmlFiles.length > 0 || Boolean(html) },
    { label: 'Checks', done: /lint|inspect|validate/i.test(msgs.map(m => m.content).join(' ')) },
    { label: 'Render', done: videoFiles.length > 0 || Boolean(mp4) },
  ];

  return (
    <div style={S.shell} role="application" aria-label="Video production cockpit">
      <header style={S.header} role="banner">
        <button onClick={onBack} style={S.backBtn} aria-label="Back to studio">← Studio</button>
        <div style={S.projectIdentity}>
          <div style={S.projectEyebrow}>Production cockpit</div>
          <div style={S.projectTitle}>{project?.name || projectId.slice(0, 8)}</div>
        </div>
        <div style={S.headerMeta}>
          <span style={S.metaPill}>{String(cfg.videoType ?? 'custom')}</span>
          <span style={S.metaPill}>{String(cfg.orientation ?? '16:9')}</span>
          <span style={S.metaPill}>{typeof cfg.duration === 'number' ? `${cfg.duration}s` : 'duration open'}</span>
          <span style={S.metaPill}>{activeOutput}</span>
        </div>
        <div style={{ flex: 1 }} />
        <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setConvMenuOpen(!convMenuOpen)} style={S.convBtn} aria-haspopup="listbox">
            {convs.find(c => c.id === convId)?.title || 'Chat'} ▾
          </button>
          {convMenuOpen && (
            <>
              <div style={S.backdrop} onClick={() => setConvMenuOpen(false)} />
              <div style={S.convMenu} role="listbox">
                {convs.map(c => (
                  <button key={c.id} onClick={() => switchConv(c.id)} style={{ ...S.convItem, ...(c.id === convId ? { background: 'var(--accent-dim)' } : {}) }}>
                    {c.title || 'Untitled'} <span style={S.convDate}>{new Date().toLocaleDateString()}</span>
                  </button>
                ))}
                <div style={S.menuRule} />
                <button onClick={newConv} style={S.convItem}>+ New conversation</button>
              </div>
            </>
          )}
        </div>
        {working && <button onClick={cancelRun} style={S.cancelBtn}>Stop run</button>}
      </header>

      {error && <div style={S.errorBanner} role="alert"><span>{error}</span><button onClick={() => setError(null)} style={S.errDismiss}>Dismiss</button></div>}
      {statusLine && <div style={S.statusLine} aria-live="polite"><span className="spinner" style={S.statusSpinner} />{statusLine}</div>}

      <div style={S.body}>
        <aside style={S.directorPanel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelKicker}>Director</div>
              <h2 style={S.panelTitle}>Brief and decisions</h2>
            </div>
            <span style={S.runState}>{working ? 'Running' : 'Ready'}</span>
          </div>

          <div style={S.messages} role="log">
            {msgs.length === 0 && !working && (
              <div style={S.emptyDirector}>
                <div style={S.emptyMark}>D</div>
                <h3 style={S.emptyHeading}>Start with a production brief</h3>
                <p style={S.emptyCopy}>The agent will ask only for missing choices, then draft storyboard, motion source, checks, and render.</p>
                <div style={S.hints}>
                  {HINT_PROMPTS.map(hint => (
                    <button key={hint} onClick={() => setInput(hint)} style={S.hintBtn}>{hint}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map(m => (
              m.role === 'user' ? (
                <UserMessage key={m.id} content={m.content} />
              ) : m.role === 'assistant' ? (
                <AssistantMessage
                  key={m.id}
                  content={m.content}
                  toolCalls={m.id === msgs.filter(x => x.role === 'assistant').pop()?.id ? toolCalls : undefined}
                  agentName={agentName}
                  elapsed={working ? elapsed : undefined}
                  working={working && m.id === msgs[msgs.length - 1]?.id}
                  status={statusLine}
                  onSubmitQuestionForm={(message) => sendText(message)}
                />
              ) : (
                <div key={m.id} style={S.systemMessage}>
                  <pre style={S.pre}>{m.content}</pre>
                </div>
              )
            ))}
            <div ref={endRef} />
          </div>
          <ChatComposer value={input} onChange={setInput} onSend={send} disabled={false} working={working} projectId={projectId} />
        </aside>

        <main style={S.stageColumn}>
          <section style={S.stageHeader}>
            <div>
              <div style={S.panelKicker}>Stage</div>
              <h2 style={S.stageTitle}>{mp4 ? 'Rendered output' : html ? 'Motion source preview' : 'Preview area'}</h2>
            </div>
            <div style={S.stageActions}>
              <button onClick={() => setShowFiles(v => !v)} style={{ ...S.softBtn, ...(showFiles ? S.softBtnActive : {}) }}>
                {showFiles ? 'Hide artifacts' : 'Show artifacts'}
              </button>
            </div>
          </section>

          <section style={S.previewShell}>
            <VideoPreview html={html} mp4Url={mp4} mode={mp4 ? 'rendered' : 'design'} duration={Number(cfg.duration ?? 10)} />
          </section>

          <section style={S.timeline}>
            <div style={S.timelineHeader}>
              <div>
                <div style={S.panelKicker}>Pipeline</div>
                <h3 style={S.timelineTitle}>Production state</h3>
              </div>
              <span style={S.timelineMeta}>{files.length} files · {convs.length} chats</span>
            </div>
            <div style={S.stepRail}>
              {pipelineSteps.map((step, i) => (
                <div key={step.label} style={S.stepBlock}>
                  <span style={{ ...S.stepNumber, ...(step.done ? S.stepNumberDone : {}) }}>{i + 1}</span>
                  <span style={{ ...S.stepLabel, color: step.done ? 'var(--fg)' : 'var(--muted)' }}>{step.label}</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside style={S.inspector}>
          <section style={S.inspectorCard}>
            <div style={S.railTitle}>Production brief</div>
            <InfoRow label="Project" value={project?.name || projectId.slice(0, 8)} />
            <InfoRow label="Type" value={String(cfg.videoType ?? 'custom')} />
            <InfoRow label="Ratio" value={String(cfg.orientation ?? '16:9')} />
            <InfoRow label="Motion" value={String(cfg.motionSystemId ?? 'unbound')} />
          </section>

          <section style={S.inspectorCard}>
            <div style={S.railTitle}>Artifacts</div>
            <div style={S.artifactStats}>
              <ArtifactStat label="Storyboards" value={storyboardFiles.length} />
              <ArtifactStat label="HTML" value={htmlFiles.length} />
              <ArtifactStat label="Videos" value={videoFiles.length} />
            </div>
            {showFiles ? (
              <div style={S.filePane}>
                <FileWorkspace key={filesVer} projectId={projectId} onSelectFile={handleFileSelect as (f: { path: string; kind: string; mime: string }) => void} />
              </div>
            ) : (
              <div style={S.artifactsCollapsed}>Artifacts are hidden from the stage controls.</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const machineBrief = isMachineBrief(content);
  const shouldCollapse = machineBrief || content.length > 720 || content.split('\n').length > 10;
  const preview = summarizeUserMessage(content, machineBrief);

  return (
    <div style={{ ...S.msg, alignSelf: 'flex-end' }}>
      <div style={S.msgMeta}>{machineBrief ? 'Production brief' : 'You'}</div>
      <div style={{ ...S.userBubble, ...(machineBrief ? S.briefBubble : {}) }}>
        {shouldCollapse && !expanded ? (
          <>
            <div style={S.briefSummary}>{preview}</div>
            <button type="button" onClick={() => setExpanded(true)} style={S.expandBtn}>
              Review full brief
            </button>
          </>
        ) : (
          <>
            <pre style={S.pre}>{content}</pre>
            {shouldCollapse && (
              <button type="button" onClick={() => setExpanded(false)} style={S.expandBtn}>
                Collapse brief
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isMachineBrief(content: string): boolean {
  return /NARRATIVE STRUCTURE|Return ONLY|VISUAL DIRECTION|VIDEO REQUEST|Production|video director|structured storyboard|BRIEF:/i.test(content);
}

function summarizeUserMessage(content: string, machineBrief: boolean): string {
  const firstMeaningful = content
    .split('\n')
    .map(line => line.replace(/^[-*#\s]+/, '').trim())
    .find(Boolean);

  if (!machineBrief) return firstMeaningful || content.slice(0, 180);

  const duration = content.match(/(\d+)\s*(second|seconds|s|秒)/i)?.[0];
  const ratio = content.match(/\b(16:9|9:16|1:1)\b/)?.[0];
  const style = content.match(/style[:：]\s*([^\n]+)/i)?.[1]?.trim();
  const pieces = [
    firstMeaningful,
    duration ? `Duration ${duration}` : null,
    ratio ? `Format ${ratio}` : null,
    style ? `Style ${style}` : null,
  ].filter(Boolean);

  return pieces.join(' · ') || 'Structured production instructions were sent to the agent.';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoLabel}>{label}</span>
      <span style={S.infoValue}>{value}</span>
    </div>
  );
}

function ArtifactStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={S.artifactStat}>
      <span style={S.artifactValue}>{value}</span>
      <span style={S.artifactLabel}>{label}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' },
  header: { minHeight: 68, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, zIndex: 10 },
  backBtn: { border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', fontWeight: 800, fontSize: 12 },
  projectIdentity: { minWidth: 220 },
  projectEyebrow: { color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 },
  projectTitle: { color: 'var(--fg)', fontSize: 16, fontWeight: 900, letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 },
  headerMeta: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaPill: { border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', borderRadius: 999, padding: '5px 8px', fontSize: 11, fontWeight: 800 },
  convBtn: { padding: '8px 11px', fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontWeight: 700 },
  backdrop: { position: 'fixed', inset: 0, zIndex: 99 },
  convMenu: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '6px 0', maxHeight: 320, overflow: 'auto' },
  convItem: { width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 },
  convDate: { fontSize: 10, color: 'var(--faint)', marginLeft: 'auto' },
  menuRule: { borderTop: '1px solid var(--border)', margin: '4px 0' },
  cancelBtn: { padding: '8px 12px', background: 'var(--danger)', color: '#fff', borderRadius: 9, fontSize: 12, cursor: 'pointer', border: 'none', fontWeight: 800 },
  errorBanner: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--danger-dim)', borderBottom: '1px solid var(--danger)', fontSize: 12, color: 'var(--danger)' },
  errDismiss: { background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' },
  statusLine: { padding: '6px 18px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', flexShrink: 0 },
  statusSpinner: { width: 10, height: 10, borderWidth: 1.5, display: 'inline-block', marginRight: 8 },
  body: { flex: 1, display: 'grid', gridTemplateColumns: '420px minmax(520px, 1fr) 340px', overflow: 'hidden' },
  directorPanel: { minWidth: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' },
  panelHeader: { padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  panelKicker: { color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 },
  panelTitle: { margin: '3px 0 0', color: 'var(--fg)', fontSize: 16, fontWeight: 900 },
  runState: { border: '1px solid var(--border)', borderRadius: 999, padding: '4px 8px', color: 'var(--muted)', fontSize: 11, fontWeight: 800 },
  messages: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  emptyDirector: { margin: 'auto 0', padding: 22, textAlign: 'center', color: 'var(--muted)' },
  emptyMark: { width: 56, height: 56, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontWeight: 900 },
  emptyHeading: { color: 'var(--fg)', margin: 0, fontSize: 17 },
  emptyCopy: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5, margin: '8px 0 14px' },
  hints: { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },
  hintBtn: { padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--muted)', fontSize: 11, cursor: 'pointer', fontWeight: 700 },
  msg: { maxWidth: '92%' },
  msgMeta: { fontSize: 9, color: 'var(--faint)', marginBottom: 2, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  userBubble: { padding: '10px 14px', borderRadius: 12, lineHeight: 1.5, background: 'var(--accent)', color: '#fff', maxWidth: 360 },
  briefBubble: { background: 'var(--fg)', color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)' },
  briefSummary: { fontSize: 12, lineHeight: 1.5, fontWeight: 700 },
  expandBtn: { marginTop: 9, padding: 0, border: 'none', background: 'transparent', color: 'inherit', opacity: 0.72, cursor: 'pointer', fontSize: 11, fontWeight: 900, textDecoration: 'underline' },
  systemMessage: { alignSelf: 'center', color: 'var(--muted)', fontSize: 11 },
  pre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', margin: 0, wordBreak: 'break-word' },
  stageColumn: { minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' },
  stageHeader: { minHeight: 72, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '0 20px', background: 'var(--bg)' },
  stageTitle: { margin: '3px 0 0', color: 'var(--fg)', fontSize: 18, fontWeight: 900 },
  stageActions: { display: 'flex', alignItems: 'center', gap: 8 },
  softBtn: { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', fontWeight: 800, fontSize: 12 },
  softBtnActive: { color: 'var(--fg)', borderColor: 'var(--accent)' },
  previewShell: { flex: 1, minHeight: 0, padding: 18, display: 'flex' },
  timeline: { borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '14px 18px 18px' },
  timelineHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  timelineTitle: { margin: '2px 0 0', color: 'var(--fg)', fontSize: 15, fontWeight: 900 },
  timelineMeta: { color: 'var(--muted)', fontSize: 11, fontWeight: 700 },
  stepRail: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  stepBlock: { border: '1px solid var(--border)', borderRadius: 11, background: 'var(--bg)', padding: 10, display: 'flex', alignItems: 'center', gap: 8 },
  stepNumber: { width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 },
  stepNumberDone: { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' },
  stepLabel: { fontSize: 12, fontWeight: 800 },
  inspector: { minWidth: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: 14 },
  inspectorCard: { border: '1px solid var(--border)', borderRadius: 13, background: 'var(--bg)', padding: 14 },
  railTitle: { color: 'var(--fg)', fontSize: 13, fontWeight: 900, marginBottom: 12 },
  infoRow: { display: 'grid', gridTemplateColumns: '86px 1fr', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-soft)', alignItems: 'baseline' },
  infoLabel: { color: 'var(--muted)', fontSize: 11, fontWeight: 800 },
  infoValue: { color: 'var(--fg)', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  artifactStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  artifactStat: { border: '1px solid var(--border)', borderRadius: 10, padding: 9, background: 'var(--surface)' },
  artifactValue: { display: 'block', color: 'var(--fg)', fontSize: 18, fontWeight: 900 },
  artifactLabel: { display: 'block', color: 'var(--muted)', fontSize: 10, fontWeight: 800, marginTop: 2 },
  filePane: { height: 460, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' },
  artifactsCollapsed: { border: '1px dashed var(--border)', borderRadius: 12, padding: 18, color: 'var(--muted)', fontSize: 12, textAlign: 'center' },
};
