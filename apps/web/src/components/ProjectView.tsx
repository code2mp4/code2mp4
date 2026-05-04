import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreview } from './video/VideoPreview';
import { FileWorkspace } from './FileWorkspace';

interface Message {
  id: string; role: 'user' | 'assistant' | 'system'; content: string;
}

interface Conversation {
  id: string; projectId: string; title: string | null;
}

interface ToolCall {
  id: string; name: string; input: Record<string, unknown>;
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
  const [filesVer, setFilesVer] = useState(0); // version bump to force FileWorkspace refresh
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [statusLine, setStatusLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | null>(null);

  // Load conversations on mount and project change
  useEffect(() => {
    setError(null);
    loadConvs().catch(() => setError('Failed to load conversations'));
  }, [projectId]);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, toolCalls]);

  // Cleanup SSE on unmount
  useEffect(() => { return () => esRef.current?.close(); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); send(); }
      if (e.key === 'Escape') {
        if (showFiles) setShowFiles(false);
        if (working && runIdRef.current) cancelRun();
      }
      if (mod && e.key === 'k') { e.preventDefault(); /* focus composer */ }
      if (mod && e.key === 'b') { e.preventDefault(); setShowFiles(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFiles, working]);

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
    setConvId(id); closeStream(); setError(null);
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
      setConvId(c.id); setConvs(prev => [c, ...prev]); setMsgs([]); setHtml(undefined); setMp4(undefined); setError(null);
    } catch { setError('Failed to create conversation'); }
  }

  const send = useCallback(async () => {
    const t = input.trim(); if (!t || working) return;
    setMsgs(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: t }]);
    setInput(''); setWorking(true); setError(null); setToolCalls([]); setStatusLine('Starting agent...');
    const aid = crypto.randomUUID();
    setMsgs(prev => [...prev, { id: aid, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: t, projectId, conversationId: convId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || 'Agent not available';
        const hint = '\n\nInstall: `npm i -g @anthropic-ai/claude-code`';
        updateMsg(aid, `${msg}${hint}`);
        setError(msg);
        setWorking(false);
        return;
      }

      const { runId, conversationId: newConvId } = await res.json();
      runIdRef.current = runId;
      if (newConvId && !convId) { setConvId(newConvId); loadConvs(); }
      connect(runId, aid);
    } catch (e) {
      updateMsg(aid, `Network error: ${e instanceof Error ? e.message : 'Connection failed'}`);
      setError('Network error');
      setWorking(false);
    }
  }, [input, working, projectId, convId]);

  function connect(runId: string, aid: string) {
    closeStream();
    const es = new EventSource(`/api/runs/${runId}/events`);
    esRef.current = es;
    let acc = '';
    let sawFirstTool = false;

    es.addEventListener('text', e => {
      const d = JSON.parse(e.data);
      const content = d.content ?? '';
      acc += content + '\n';
      updateMsg(aid, acc);
      // Detect file writes in agent output
      detectFileOps(content);
      detectHtmlArtifact(acc);
    });

    es.addEventListener('text_delta', e => {
      const d = JSON.parse(e.data);
      acc += d.content ?? '';
      updateMsg(aid, acc);
      detectFileOps(d.content ?? '');
      detectHtmlArtifact(acc);
    });

    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      const label = d.label ?? d.status ?? '';
      setStatusLine(label);
      if (!sawFirstTool) acc += `_${label}..._\n`;
      updateMsg(aid, acc);
    });

    es.addEventListener('tool_use', e => {
      const d = JSON.parse(e.data);
      sawFirstTool = true;
      setToolCalls(prev => [...prev.slice(-19), { id: d.id, name: d.name, input: d.input || {} }]);
      setStatusLine(`🔧 ${d.name}`);
      // Detect Bash/Write operations for file ops
      if (d.name === 'Write' || d.name === 'Bash') {
        setStatusLine(`🔧 ${d.name}: ${JSON.stringify(d.input).slice(0, 80)}`);
      }
    });

    es.addEventListener('tool_result', e => {
      const d = JSON.parse(e.data);
      if (d.is_error) setStatusLine(`⚠️ ${String(d.content).slice(0, 80)}`);
      // After a tool result, bump file version to refresh
      setFilesVer(v => v + 1);
    });

    es.addEventListener('result', e => {
      const d = JSON.parse(e.data);
      if (d.subtype === 'success') setStatusLine('✓ Complete');
      // Bump file version so FileWorkspace picks up new files
      setFilesVer(v => v + 1);
    });

    es.addEventListener('end', () => {
      setWorking(false); setStatusLine('');
      closeStream();
      extractHtml(acc);
      loadConvs();
      setFilesVer(v => v + 1);
    });

    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setWorking(false); setStatusLine('');
        updateMsg(aid, acc || 'Stream ended unexpectedly.');
        extractHtml(acc);
        setFilesVer(v => v + 1);
      } else if (es.readyState === EventSource.CONNECTING) {
        // Auto-reconnecting — show status
        setStatusLine('Reconnecting...');
        setRetryCount(c => c + 1);
      }
    });
  }

  function detectFileOps(content: string) {
    // Detect file writes: "Wrote file", "wrote to", "Writing to", etc.
    const patterns = [
      /wrote\s+(?:file\s+)?[`"']?([^\s`"']+\.(?:html|mp4|wav|mp3|png|jpg|json|md|txt))[`"']?/i,
      /writing\s+(?:to\s+)?[`"']?([^\s`"']+\.(?:html|mp4|wav|mp3|png|jpg|json|md|txt))[`"']?/i,
      /created\s+[`"']?([^\s`"']+\.(?:html|mp4|wav|mp3|png|jpg|json|md|txt))[`"']?/i,
    ];
    for (const re of patterns) {
      const m = content.match(re);
      if (m) { setFilesVer(v => v + 1); break; }
    }
  }

  function detectHtmlArtifact(text: string) {
    // Extract <artifact> or <!doctype html> blocks
    const m = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i) || text.match(/(<!doctype html>[\s\S]*?<\/html>)/i);
    if (m?.[1]?.trim()) setHtml(m[1].trim());
  }

  function updateMsg(id: string, c: string) {
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, content: c } : m));
  }

  function extractHtml(text: string) {
    const m = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i) || text.match(/(<!doctype html>[\s\S]*?<\/html>)/i);
    if (m?.[1]?.trim()) setHtml(m[1].trim());
  }

  function closeStream() {
    esRef.current?.close();
    esRef.current = null;
  }

  const cancelRun = useCallback(async () => {
    const rid = runIdRef.current;
    if (rid) {
      await fetch(`/api/runs/${rid}/cancel`, { method: 'POST' }).catch(() => {});
    }
    closeStream();
    setWorking(false);
    setStatusLine('Cancelled');
    setFilesVer(v => v + 1);
  }, []);

  const handleFileSelect = useCallback(async (file: { path: string; kind: string; mime: string }) => {
    if (file.kind === 'video') {
      setMp4(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
    } else if (file.kind === 'html') {
      const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
      setHtml(await res.text());
    }
  }, [projectId]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  return (
    <div style={S.shell} role="application" aria-label="Video project workspace">
      {/* Header */}
      <header style={S.header} role="banner">
        <button onClick={onBack} style={S.back} aria-label="Back to projects">← Back</button>
        <span style={S.title} aria-label={`Project ${projectId.slice(0, 8)}`}>{projectId.slice(0, 8)}</span>

        <div style={S.convTabs} role="tablist" aria-label="Conversations">
          {convs.slice(0, 4).map(c => (
            <button key={c.id} onClick={() => switchConv(c.id)} role="tab"
              aria-selected={c.id === convId}
              style={{ ...S.convTab, ...(c.id === convId ? S.convTabOn : {}) }}>
              {c.title || 'Chat'}
            </button>
          ))}
          <button onClick={newConv} style={S.convNew} aria-label="New conversation">+</button>
        </div>

        <button onClick={() => setShowFiles(v => !v)}
          style={{ ...S.toggleBtn, background: showFiles ? 'var(--accent-dim)' : 'transparent', color: showFiles ? 'var(--accent)' : 'var(--muted)' }}
          aria-label={showFiles ? 'Hide files' : 'Show files'} title="⌘B">
          📁 {showFiles ? 'Hide' : 'Files'}
        </button>
        {working && <button onClick={cancelRun} style={S.cancelBtn} aria-label="Stop agent">Stop</button>}
      </header>

      {/* Error banner */}
      {error && (
        <div style={S.errorBanner} role="alert">
          <span>{error}</span>
          <button onClick={() => { setError(null); loadConvs(); }} style={S.errorDismiss}>Dismiss</button>
        </div>
      )}

      {/* Status line */}
      {statusLine && (
        <div style={S.statusLine} aria-live="polite">
          <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5, display: 'inline-block', marginRight: 8 }} />
          {statusLine}
        </div>
      )}

      <div style={S.body}>
        {/* Chat */}
        <div style={S.chat} role="log" aria-label="Chat messages">
          <div style={S.msgs}>
            {msgs.length === 0 && !working && (
              <div style={S.emptyChat}>
                <span style={{ fontSize: 36, marginBottom: 12 }}>🎬</span>
                <p style={{ color: 'var(--fg)', fontWeight: 600, marginBottom: 4 }}>Start a new video</p>
                <p style={{ color: 'var(--muted)', fontSize: 12 }}>
                  Describe what you want — the AI agent will generate a HyperFrames composition and render it to MP4.
                </p>
                <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Product launch video', 'Social media reel', 'Brand intro animation', 'Tutorial explainer'].map(hint => (
                    <button key={hint} onClick={() => { setInput(hint); }} style={S.hintBtn}>{hint}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} style={{ ...S.msg, alignSelf: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start' }}>
                <div style={S.msgMeta}>
                  {m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Agent' : ''}
                </div>
                <div style={{ ...S.bubble, background: m.role === 'user' ? 'var(--accent)' : m.role === 'system' ? 'transparent' : 'var(--surface)', color: m.role === 'user' ? '#fff' : m.role === 'system' ? 'var(--muted)' : 'var(--fg)', fontSize: m.role === 'system' ? 11 : 13 }}>
                  <pre style={S.pre}>{m.content || (m.role === 'assistant' && working ? '...' : '')}</pre>
                </div>
              </div>
            ))}

            {/* Tool calls display */}
            {toolCalls.length > 0 && (
              <div style={S.toolSection}>
                <div style={S.toolHeader}>🔧 Tools used</div>
                {toolCalls.map(tc => (
                  <div key={tc.id} style={S.toolItem}>
                    <span style={S.toolName}>{tc.name}</span>
                    <span style={S.toolInput}>{JSON.stringify(tc.input).slice(0, 120)}</span>
                  </div>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div style={S.composer}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={working ? 'Agent is working...' : 'Describe your video... (⌘Enter to send)'}
              style={S.textarea} disabled={working} rows={3}
              aria-label="Message input" />
            <button onClick={send} disabled={!input.trim() || working}
              style={{ ...S.sendBtn, opacity: input.trim() && !working ? 1 : 0.4 }}
              aria-label="Send message">
              {working ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : '→'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={S.preview}>
          <VideoPreview html={html} mp4Url={mp4} mode={mp4 ? 'rendered' : 'design'} duration={10} />
          {renderProgress && (
            <div style={S.progress}>
              <div style={{ ...S.progressBar, width: `${(renderProgress.frame / renderProgress.total) * 100}%` }} />
              <span style={S.progressText}>{renderProgress.frame}/{renderProgress.total}</span>
            </div>
          )}
        </div>

        {/* File workspace */}
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
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, zIndex: 10 },
  back: { color: 'var(--accent)', fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 600, padding: '4px 8px', borderRadius: 'var(--radius-sm)' },
  title: { fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' },
  convTabs: { display: 'flex', gap: 4, flex: 1, overflow: 'hidden' },
  convTab: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  convTabOn: { background: 'var(--surface-hover)', color: 'var(--fg)' },
  convNew: { padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' },
  toggleBtn: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '4px 12px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', border: 'none' },
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', background: 'var(--danger-dim)', borderBottom: '1px solid var(--danger)', fontSize: 12, color: 'var(--danger)', flexShrink: 0 },
  errorDismiss: { background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' },
  statusLine: { padding: '4px 16px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', flexShrink: 0 },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  chat: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRight: '1px solid var(--border)' },
  msgs: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' as const },
  hintBtn: { padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' },
  msg: { maxWidth: '85%' },
  msgMeta: { fontSize: 9, color: 'var(--faint)', marginBottom: 2, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  bubble: { padding: '10px 14px', borderRadius: 'var(--radius)', lineHeight: 1.5 },
  pre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', margin: 0, wordBreak: 'break-word' as const },
  composer: { padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface)' },
  textarea: { flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--fg)', fontSize: 13, resize: 'none' as const, outline: 'none', fontFamily: 'inherit' },
  sendBtn: { width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 16, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' },
  preview: { flex: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 0 },
  filePanel: { width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)' },
  progress: { height: 4, background: 'var(--surface)', borderRadius: 2, position: 'relative', width: '100%', flexShrink: 0 },
  progressBar: { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' },
  progressText: { position: 'absolute', top: -18, right: 0, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  toolSection: { alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '8px 12px', border: '1px solid var(--border)' },
  toolHeader: { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  toolItem: { display: 'flex', gap: 8, fontSize: 11, padding: '2px 0', alignItems: 'baseline' },
  toolName: { color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' },
  toolInput: { color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
