import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreview } from './video/VideoPreview';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  htmlPreview?: string;
}

interface Conversation {
  id: string;
  projectId: string;
  title: string | null;
}

interface Props {
  projectId: string;
  onBack: () => void;
}

export function ProjectView({ projectId, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [composing, setComposing] = useState('');
  const [working, setWorking] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string>();
  const [currentMp4, setCurrentMp4] = useState<string>();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`);
      const convs: Conversation[] = await res.json();
      setConversations(convs);

      // Load latest conversation's messages
      if (convs.length > 0) {
        const latest = convs[0];
        setConversationId(latest.id);
        const msgs = await fetch(`/api/conversations/${latest.id}/messages`).then(r => r.json());
        setMessages(msgs.map((m: { id: string; role: string; content: string }) => ({
          id: m.id, role: m.role as Message['role'], content: m.content,
        })));
      }
    } catch {
      // Project may not exist yet or no conversations
    }
  }

  async function switchConversation(convId: string) {
    setConversationId(convId);
    eventSourceRef.current?.close();
    try {
      const msgs = await fetch(`/api/conversations/${convId}/messages`).then(r => r.json());
      setMessages(msgs.map((m: { id: string; role: string; content: string }) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
      })));
    } catch { setMessages([]); }
  }

  async function newConversation() {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'New chat' }),
      });
      const conv = await res.json();
      setConversationId(conv.id);
      setConversations(prev => [conv, ...prev]);
      setMessages([]);
    } catch {
      // Fallback
    }
  }

  const sendMessage = useCallback(async () => {
    const text = composing.trim();
    if (!text || working) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setComposing('');
    setWorking(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, projectId, conversationId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown' }));
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: `Error: ${err.error || err.detail}\n\nInstall an AI agent CLI:\n- npm i -g @anthropic-ai/claude-code\n- npm i -g opencode\n- npm i -g @google/gemini-cli` } : m
        ));
        setWorking(false);
        return;
      }

      const { runId: newRunId, conversationId: newConvId } = await res.json();
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
        loadConversations();
      }

      connectToRunEvents(newRunId, assistantId);
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `Connection error: ${err instanceof Error ? err.message : 'Unknown'}` } : m
      ));
      setWorking(false);
    }
  }, [composing, working, projectId, conversationId]);

  function connectToRunEvents(runId: string, assistantMsgId: string) {
    eventSourceRef.current?.close();
    const es = new EventSource(`/api/runs/${runId}/events`);
    eventSourceRef.current = es;
    let accumulated = '';

    es.addEventListener('text', e => {
      accumulated += (JSON.parse(e.data).content ?? '') + '\n';
      updateMsg(assistantMsgId, accumulated);
    });
    es.addEventListener('text_delta', e => {
      accumulated += JSON.parse(e.data).content ?? '';
      updateMsg(assistantMsgId, accumulated);
    });
    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      if (d.status === 'running') {
        accumulated += `_${d.label ?? 'Working'}..._\n`;
        updateMsg(assistantMsgId, accumulated);
      }
    });
    es.addEventListener('tool_use', e => {
      const d = JSON.parse(e.data);
      accumulated += `\n**🔧 ${d.name}** ${JSON.stringify(d.input).slice(0, 160)}\n`;
      updateMsg(assistantMsgId, accumulated);
    });
    es.addEventListener('tool_result', e => {
      const d = JSON.parse(e.data);
      if (d.is_error) accumulated += `⚠️ ${JSON.stringify(d.content).slice(0, 200)}\n`;
      updateMsg(assistantMsgId, accumulated);
    });
    es.addEventListener('end', () => {
      setWorking(false);
      es.close();
      eventSourceRef.current = null;
      extractHtmlPreview(accumulated);
      // Refresh conversations to show updated title
      loadConversations();
    });
    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setWorking(false);
        updateMsg(assistantMsgId, accumulated || 'Stream ended.');
        extractHtmlPreview(accumulated);
      }
    });
  }

  function updateMsg(id: string, content: string) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }

  function extractHtmlPreview(text: string) {
    const m = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i)
          || text.match(/(<!doctype html>[\s\S]*?<\/html>)/i);
    if (m?.[1]?.trim()) setCurrentHtml(m[1].trim());
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const cancelRun = useCallback(async () => {
    const runId = eventSourceRef.current?.url.match(/runs\/([^/]+)/)?.[1];
    if (runId) {
      await fetch(`/api/runs/${runId}/cancel`, { method: 'POST' }).catch(() => {});
    }
    eventSourceRef.current?.close();
    setWorking(false);
  }, []);

  return (
    <div style={styles.shell}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <span style={styles.headerTitle}>{projectId.slice(0, 8)}</span>
        <div style={{ flex: 1 }} />

        {/* Conversation tabs */}
        <div style={styles.convTabs}>
          {conversations.slice(0, 4).map(c => (
            <button key={c.id} onClick={() => switchConversation(c.id)}
              style={{ ...styles.convTab, ...(c.id === conversationId ? styles.convTabActive : {}) }}>
              {c.title || 'Chat'}
            </button>
          ))}
          <button onClick={newConversation} style={styles.convNew}>+</button>
        </div>

        {working && <button onClick={cancelRun} style={styles.cancelBtn}>Stop</button>}
      </header>

      {/* Body */}
      <div style={styles.body}>
        <div style={styles.chat}>
          <div style={styles.chatMessages}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                ...styles.message,
                alignSelf: msg.role === 'user' ? 'flex-end' : msg.role === 'system' ? 'center' : 'flex-start',
              }}>
                <div style={{
                  ...styles.bubble,
                  background: msg.role === 'user' ? 'var(--accent)' : msg.role === 'system' ? 'transparent' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : msg.role === 'system' ? 'var(--muted)' : 'var(--fg)',
                  fontSize: msg.role === 'system' ? 11 : 13,
                }}>
                  <pre style={styles.pre}>{msg.content}</pre>
                </div>
              </div>
            ))}
            {working && !messages.some(m => m.role === 'assistant' && m.content) && (
              <div style={{ ...styles.message, alignSelf: 'flex-start' }}>
                <div style={{ ...styles.bubble, background: 'var(--surface)', opacity: 0.6 }}>Waiting for agent...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={styles.composer}>
            <textarea value={composing} onChange={e => setComposing(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Describe your video..." style={styles.input} disabled={working} rows={3} />
            <button onClick={sendMessage} disabled={!composing.trim() || working}
              style={{ ...styles.sendBtn, opacity: composing.trim() && !working ? 1 : 0.4 }}>
              {working ? '···' : '→'}
            </button>
          </div>
        </div>

        <div style={styles.preview}>
          {currentHtml || currentMp4 ? (
            <VideoPreview html={currentHtml} mp4Url={currentMp4} mode={currentMp4 ? 'rendered' : 'design'} duration={10} />
          ) : (
            <div style={styles.empty}>
              <span style={{ fontSize: 40, marginBottom: 16 }}>🎬</span>
              <p style={{ color: 'var(--muted)' }}>Describe your video.</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>AI agent → HyperFrames HTML → MP4</p>
              <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 12 }}>
                <code style={styles.code}>npm i -g @anthropic-ai/claude-code</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  backBtn: { color: 'var(--accent)', fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 600 },
  headerTitle: { fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' },
  convTabs: { display: 'flex', gap: 4, flex: 1, overflow: 'hidden' },
  convTab: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  convTabActive: { background: 'var(--surface-hover)', color: 'var(--fg)' },
  convNew: { padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '4px 12px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', border: 'none' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  chat: { width: 420, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  chatMessages: { flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  message: { maxWidth: '90%' },
  bubble: { padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, lineHeight: 1.5 },
  pre: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', margin: 0 },
  composer: { padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--fg)', fontSize: 13, resize: 'none' as const, outline: 'none', fontFamily: 'inherit' },
  sendBtn: { width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 16, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  preview: { flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center' as const, maxWidth: 360, color: 'var(--muted)' },
  code: { fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--surface)', padding: '2px 6px', borderRadius: 3 },
};
