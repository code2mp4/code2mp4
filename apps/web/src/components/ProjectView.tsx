import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreview } from './video/VideoPreview';
import { FileWorkspace } from './FileWorkspace';
import { AgentPicker } from './AgentPicker';
import { AssistantMessage } from './AssistantMessage';
import { ChatComposer } from './ChatComposer';

interface Message {
  id: string; role: 'user' | 'assistant' | 'system'; content: string;
}

interface Conversation { id: string; projectId: string; title: string | null; }

interface ToolCall { id: string; name: string; input: Record<string, unknown>; }

interface Props {
  projectId: string; onBack: () => void;
  selectedAgentId: string | null; onSelectAgent: (id: string) => void;
}

const HINT_PROMPTS = [
  'Product launch video — 15s, 16:9, tech style',
  'Social media reel — 8s, 9:16 vertical, fast cuts',
  'Brand intro animation — 5s, logo reveal, dark canvas',
  'Tutorial explainer — 60s, step-by-step, code blocks',
];

export function ProjectView({ projectId, onBack, selectedAgentId, onSelectAgent }: Props) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [html, setHtml] = useState<string>();
  const [mp4, setMp4] = useState<string>();
  const [convId, setConvId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [filesVer, setFilesVer] = useState(0);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [statusLine, setStatusLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [convMenuOpen, setConvMenuOpen] = useState(false);
  const [agentName, setAgentName] = useState('Agent');
  const [elapsed, setElapsed] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => { setError(null); loadConvs().catch(() => setError('Failed to load conversations')); }, [projectId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, toolCalls]);
  useEffect(() => { return () => esRef.current?.close(); }, []);

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

  const send = useCallback(async () => {
    const t = input.trim(); if (!t || working) return;
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
  }, [input, working, projectId, convId, selectedAgentId]);

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

  return (
    <div style={S.shell} role="application" aria-label="Video project workspace">
      <header style={S.header} role="banner">
        <button onClick={onBack} style={S.back} aria-label="Back to projects">←</button>
        <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
        <span style={S.title}>{projectId.slice(0, 8)}</span>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setConvMenuOpen(!convMenuOpen)} style={S.convBtn} aria-haspopup="listbox">
            💬 {convs.find(c => c.id === convId)?.title || 'Chat'} ▾
          </button>
          {convMenuOpen && (
            <>
              <div style={S.backdrop} onClick={() => setConvMenuOpen(false)} />
              <div style={S.convMenu} role="listbox">
                {convs.map(c => (
                  <button key={c.id} onClick={() => switchConv(c.id)} style={{ ...S.convItem, ...(c.id === convId ? { background: 'var(--accent-dim)' } : {}) }}>
                    {c.title || 'Untitled'} <span style={{ fontSize: 9, color: 'var(--faint)', marginLeft: 'auto' }}>{new Date().toLocaleDateString()}</span>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <button onClick={newConv} style={S.convItem}>+ New conversation</button>
              </div>
            </>
          )}
        </div>

        <button onClick={() => setShowFiles(v => !v)} style={{ ...S.toggleBtn, background: showFiles ? 'var(--accent-dim)' : 'transparent', color: showFiles ? 'var(--accent)' : 'var(--muted)' }} title="⌘B">📁</button>
        {working && <button onClick={cancelRun} style={S.cancelBtn}>⏹ Stop</button>}
      </header>

      {error && <div style={S.errorBanner} role="alert"><span>{error}</span><button onClick={() => setError(null)} style={S.errDismiss}>Dismiss</button></div>}
      {statusLine && <div style={S.statusLine} aria-live="polite"><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5, display: 'inline-block', marginRight: 8 }} />{statusLine}</div>}

      <div style={S.body}>
        <div style={S.chat} role="log">
          <div style={S.msgs}>
            {msgs.length === 0 && !working && (
              <div style={S.empty}>
                <span style={{ fontSize: 32, marginBottom: 12 }}>🎬</span>
                <p style={{ color: 'var(--fg)', fontWeight: 600, marginBottom: 4 }}>Start a new video</p>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>Describe what you want — the AI agent generates + renders to MP4.</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {HINT_PROMPTS.map(hint => (
                    <button key={hint} onClick={() => setInput(hint)} style={S.hintBtn}>{hint}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map(m => (
              m.role === 'user' ? (
                <div key={m.id} style={{ ...S.msg, alignSelf: 'flex-end' }}>
                  <div style={S.msgMeta}>You</div>
                  <div style={{ ...S.bubble, background: 'var(--accent)', color: '#fff' }}>
                    <pre style={S.pre}>{m.content}</pre>
                  </div>
                </div>
              ) : m.role === 'assistant' ? (
                <AssistantMessage
                  key={m.id}
                  content={m.content}
                  toolCalls={m.id === msgs.filter(x => x.role === 'assistant').pop()?.id ? toolCalls : undefined}
                  agentName={agentName}
                  elapsed={working ? elapsed : undefined}
                  working={working && m.id === msgs[msgs.length - 1]?.id}
                  status={statusLine}
                />
              ) : (
                <div key={m.id} style={{ ...S.msg, alignSelf: 'center' }}>
                  <div style={{ ...S.bubble, background: 'transparent', color: 'var(--muted)', fontSize: 11 }}>
                    <pre style={S.pre}>{m.content}</pre>
                  </div>
                </div>
              )
            ))}
            <div ref={endRef} />
          </div>
          <ChatComposer value={input} onChange={setInput} onSend={send} disabled={false} working={working} projectId={projectId} />
        </div>

        <div style={S.preview}>
          <VideoPreview html={html} mp4Url={mp4} mode={mp4 ? 'rendered' : 'design'} duration={10} />
        </div>

        {showFiles && (
          <div style={S.filePanel}>
            <FileWorkspace key={filesVer} projectId={projectId} onSelectFile={handleFileSelect as (f: { path: string; kind: string; mime: string }) => void} />
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, zIndex: 10 },
  back: { color: 'var(--accent)', fontSize: 14, cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--radius-sm)' },
  title: { fontSize: 11, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' },
  convBtn: { padding: '4px 10px', fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  backdrop: { position: 'fixed', inset: 0, zIndex: 99 },
  convMenu: { position: 'absolute', top: '100%', left: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '4px 0', maxHeight: 280, overflow: 'auto' },
  convItem: { width: '100%', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg)', textAlign: 'left', display: 'flex', alignItems: 'center' },
  toggleBtn: { padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 13, border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '4px 10px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 11, cursor: 'pointer', border: 'none' },
  errorBanner: { display: 'flex', justifyContent: 'space-between', padding: '6px 14px', background: 'var(--danger-dim)', borderBottom: '1px solid var(--danger)', fontSize: 12, color: 'var(--danger)' },
  errDismiss: { background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' },
  statusLine: { padding: '4px 16px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', flexShrink: 0 },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  chat: { width: 380, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  msgs: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' },
  hintBtn: { padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' },
  msg: { maxWidth: '92%' },
  msgMeta: { fontSize: 9, color: 'var(--faint)', marginBottom: 2, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  bubble: { padding: '10px 14px', borderRadius: 'var(--radius)', lineHeight: 1.5 },
  pre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', margin: 0, wordBreak: 'break-word' },
  preview: { flex: 1.5, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 },
  filePanel: { width: 260, flexShrink: 0, borderLeft: '1px solid var(--border)' },
};
