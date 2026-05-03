import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreview } from './video/VideoPreview';
import { FileWorkspace } from './FileWorkspace';

interface Message {
  id: string; role: 'user' | 'assistant' | 'system'; content: string;
}

interface Conversation {
  id: string; projectId: string; title: string | null;
}

interface Props { projectId: string; onBack: () => void; }

export function ProjectView({ projectId, onBack }: Props) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [html, setHtml] = useState<string>();
  const [mp4, setMp4] = useState<string>();
  const [convId, setConvId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [renderProgress, setRenderProgress] = useState<{ frame: number; total: number } | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => { loadConvs(); }, [projectId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { return () => esRef.current?.close(); }, []);

  async function loadConvs() {
    try {
      const convs = await fetch(`/api/projects/${projectId}/conversations`).then(r => r.json());
      setConvs(convs);
      if (convs.length > 0) {
        setConvId(convs[0].id);
        const msgs = await fetch(`/api/conversations/${convs[0].id}/messages`).then(r => r.json());
        setMsgs(msgs.map((m: { id: string; role: string; content: string }) => ({
          id: m.id, role: m.role as Message['role'], content: m.content,
        })));
      }
    } catch {}
  }

  async function switchConv(id: string) {
    setConvId(id); esRef.current?.close();
    try {
      const msgs = await fetch(`/api/conversations/${id}/messages`).then(r => r.json());
      setMsgs(msgs.map((m: { id: string; role: string; content: string }) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
      })));
    } catch { setMsgs([]); }
  }

  async function newConv() {
    try {
      const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, title: 'New chat' }) });
      const c = await res.json();
      setConvId(c.id); setConvs(prev => [c, ...prev]); setMsgs([]);
    } catch {}
  }

  const send = useCallback(async () => {
    const t = input.trim(); if (!t || working) return;
    setMsgs(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: t }]);
    setInput(''); setWorking(true);
    const aid = crypto.randomUUID();
    setMsgs(prev => [...prev, { id: aid, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: t, projectId, conversationId: convId }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        updateMsg(aid, `Error: ${err.error || 'Failed'}\n\nInstall an AI agent CLI:\nnpm i -g @anthropic-ai/claude-code`);
        setWorking(false); return;
      }
      const { runId, conversationId: newConvId } = await res.json();
      if (newConvId && !convId) { setConvId(newConvId); loadConvs(); }
      connect(runId, aid);
    } catch (e) {
      updateMsg(aid, `Connection error: ${e instanceof Error ? e.message : 'Unknown'}`);
      setWorking(false);
    }
  }, [input, working, projectId, convId]);

  function connect(runId: string, aid: string) {
    esRef.current?.close();
    const es = new EventSource(`/api/runs/${runId}/events`);
    esRef.current = es;
    let acc = '';

    es.addEventListener('text', e => { acc += (JSON.parse(e.data).content ?? '') + '\n'; updateMsg(aid, acc); });
    es.addEventListener('text_delta', e => { acc += JSON.parse(e.data).content ?? ''; updateMsg(aid, acc); });
    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      if (d.status === 'running') { acc += `_${d.label ?? 'Working'}..._\n`; updateMsg(aid, acc); }
    });
    es.addEventListener('tool_use', e => {
      const d = JSON.parse(e.data);
      acc += `\n**🔧 ${d.name}** ${JSON.stringify(d.input).slice(0, 160)}\n`; updateMsg(aid, acc);
    });
    es.addEventListener('tool_result', e => {
      const d = JSON.parse(e.data);
      if (d.is_error) acc += `⚠️ Error\n`; updateMsg(aid, acc);
    });
    es.addEventListener('end', () => {
      setWorking(false); es.close(); esRef.current = null;
      extractHtml(acc); loadConvs();
    });
    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setWorking(false); updateMsg(aid, acc || 'Stream ended.'); extractHtml(acc);
      }
    });
  }

  function updateMsg(id: string, c: string) { setMsgs(prev => prev.map(m => m.id === id ? { ...m, content: c } : m)); }

  function extractHtml(text: string) {
    const m = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i) || text.match(/(<!doctype html>[\s\S]*?<\/html>)/i);
    if (m?.[1]?.trim()) setHtml(m[1].trim());
  }

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const cancel = useCallback(async () => {
    const rid = esRef.current?.url.match(/runs\/([^/]+)/)?.[1];
    if (rid) await fetch(`/api/runs/${rid}/cancel`, { method: 'POST' }).catch(() => {});
    esRef.current?.close(); setWorking(false);
  }, []);

  const handleFileSelect = useCallback(async (file: { path: string; kind: string; mime: string }) => {
    if (file.kind === 'video') {
      setMp4(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
    } else if (file.kind === 'html') {
      const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
      setHtml(await res.text());
    }
  }, [projectId]);

  return (
    <div style={S.shell}>
      <header style={S.header}>
        <button onClick={onBack} style={S.back}>← Back</button>
        <span style={S.title}>{projectId.slice(0, 8)}</span>

        {/* Conversation tabs */}
        <div style={S.convTabs}>
          {convs.slice(0, 4).map(c => (
            <button key={c.id} onClick={() => switchConv(c.id)}
              style={{ ...S.convTab, ...(c.id === convId ? S.convTabOn : {}) }}>
              {c.title || 'Chat'}
            </button>
          ))}
          <button onClick={newConv} style={S.convNew}>+</button>
        </div>

        <button onClick={() => setShowFiles(v => !v)}
          style={{ ...S.toggleBtn, background: showFiles ? 'var(--accent-dim)' : 'transparent', color: showFiles ? 'var(--accent)' : 'var(--muted)' }}>
          📁 Files
        </button>
        {working && <button onClick={cancel} style={S.cancelBtn}>Stop</button>}
      </header>

      <div style={S.body}>
        {/* Chat */}
        <div style={S.chat}>
          <div style={S.msgs}>
            {msgs.map(m => (
              <div key={m.id} style={{ ...S.msg, alignSelf: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start' }}>
                <div style={{ ...S.bubble, background: m.role === 'user' ? 'var(--accent)' : m.role === 'system' ? 'transparent' : 'var(--surface)', color: m.role === 'user' ? '#fff' : m.role === 'system' ? 'var(--muted)' : 'var(--fg)', fontSize: m.role === 'system' ? 11 : 13 }}>
                  <pre style={S.pre}>{m.content}</pre>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={S.composer}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Describe your video..." style={S.input} disabled={working} rows={3} />
            <button onClick={send} disabled={!input.trim() || working}
              style={{ ...S.sendBtn, opacity: input.trim() && !working ? 1 : 0.4 }}>
              {working ? '···' : '→'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={S.preview}>
          {html || mp4 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <VideoPreview html={html} mp4Url={mp4} mode={mp4 ? 'rendered' : 'design'} duration={10} />
              {renderProgress && (
                <div style={S.progress}>
                  <div style={{ ...S.progressBar, width: `${(renderProgress.frame / renderProgress.total) * 100}%` }} />
                  <span style={S.progressText}>{renderProgress.frame}/{renderProgress.total} frames</span>
                </div>
              )}
            </div>
          ) : (
            <div style={S.empty}>
              <span style={{ fontSize: 40, marginBottom: 16 }}>🎬</span>
              <p style={{ color: 'var(--muted)' }}>Describe your video in the chat.</p>
              <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 12 }}>
                <code style={S.code}>npm i -g @anthropic-ai/claude-code</code>
              </p>
            </div>
          )}
        </div>

        {/* File workspace */}
        {showFiles && (
          <div style={S.filePanel}>
            <FileWorkspace projectId={projectId} onSelectFile={handleFileSelect as (f: { path: string; kind: string; mime: string }) => void} />
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  back: { color: 'var(--accent)', fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 600 },
  title: { fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' },
  convTabs: { display: 'flex', gap: 4, flex: 1, overflow: 'hidden' },
  convTab: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  convTabOn: { background: 'var(--surface-hover)', color: 'var(--fg)' },
  convNew: { padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' },
  toggleBtn: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '4px 12px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', border: 'none' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  chat: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRight: '1px solid var(--border)' },
  msgs: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  msg: { maxWidth: '85%' },
  bubble: { padding: '10px 14px', borderRadius: 'var(--radius)', lineHeight: 1.5 },
  pre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', margin: 0 },
  composer: { padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--fg)', fontSize: 13, resize: 'none' as const, outline: 'none', fontFamily: 'inherit' },
  sendBtn: { width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 16, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  preview: { flex: 1.5, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  empty: { textAlign: 'center' as const, maxWidth: 360, color: 'var(--muted)' },
  code: { fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--surface)', padding: '2px 6px', borderRadius: 3 },
  filePanel: { width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)' },
  progress: {
    height: 4, background: 'var(--surface)', borderRadius: 2, position: 'relative',
    marginTop: 0,
  },
  progressBar: {
    height: '100%', background: 'var(--accent)', borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute', top: -18, right: 0,
    fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
  },
};
