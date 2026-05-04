import { useState, useEffect } from 'react';
import type { VideoProjectConfig } from '@code2mp4/contracts';
import { NewVideoProjectPanel } from './NewVideoProjectPanel';
import { QuickChatPanel } from './QuickChatPanel';
import { AgentPicker } from './AgentPicker';

interface ProjectItem {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

interface Props {
  projects: ProjectItem[];
  onCreateProject: (name: string, config: VideoProjectConfig) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

export function EntryView({
  projects, onCreateProject, onOpenProject, onDeleteProject,
  selectedAgentId, onSelectAgent,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [mode, setMode] = useState<'quick' | 'manual'>('quick');

  // Check server status on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { setAgentCount(d.detectedAgents ?? 0); setError(null); })
      .catch(() => setError('Server not running. Start with: pnpm dev'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={S.shell} role="application" aria-label="Open Video">
      {/* Sidebar */}
      <aside style={{ ...S.sidebar, width: collapsed ? 48 : 360 }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} style={S.expandBtn} aria-label="Expand sidebar">
            ▸
          </button>
        ) : (
          <>
            <div style={S.brand}>
              <span style={S.brandMark} aria-hidden>◈</span>
              <div style={{ flex: 1 }}>
                <div style={S.brandTitle}>Open Video</div>
                <div style={S.brandSub}>
                  {loading ? (
                    <span className="skeleton" style={{ display: 'inline-block', width: 60, height: 10 }} />
                  ) : error ? (
                    <span style={{ color: 'var(--danger)' }}>{error}</span>
                  ) : (
                    <span>{agentCount} agents detected</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                style={S.collapseBtn}
                aria-label="Collapse sidebar"
              >
                «
              </button>
            </div>
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
              <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
            </div>

            {/* Mode toggle */}
            <div style={{ padding: '12px 20px 0' }}>
              <div style={S.modeToggle}>
                <button
                  onClick={() => setMode('quick')}
                  style={{ ...S.modeBtn, ...(mode === 'quick' ? S.modeBtnActive : {}) }}
                >💬 Quick Chat</button>
                <button
                  onClick={() => setMode('manual')}
                  style={{ ...S.modeBtn, ...(mode === 'manual' ? S.modeBtnActive : {}) }}
                >⚙ Manual Setup</button>
              </div>
            </div>

            {mode === 'quick' ? (
              <QuickChatPanel
                onCreate={(name, prompt) => {
                  onCreateProject(name, {
                    videoType: 'custom', orientation: '16:9', duration: 10, energy: 'medium',
                    motionSystemId: 'tech', copy: prompt,
                  });
                }}
              />
            ) : (
              <NewVideoProjectPanel onCreate={onCreateProject} />
            )}
          </>
        )}
      </aside>

      {/* Main */}
      <main style={S.main} role="main" aria-label="Recent projects">
        <h2 style={S.heading}>Recent Videos</h2>
        {loading ? (
          <div style={S.grid}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card" style={{ height: 80, display: 'flex', alignItems: 'center', padding: 16, gap: 12 }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius)' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: 120, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: 80 }} />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={S.empty}>
            <span style={{ fontSize: 40 }} aria-hidden>🎬</span>
            <p style={{ marginTop: 12, color: 'var(--fg)', fontWeight: 600 }}>Create your first AI-powered video</p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              Pick a video type from the sidebar, describe what you want, and
              the AI agent will produce a HyperFrames composition rendered to MP4.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 12 }}>
              Prerequisite: install an AI agent CLI
              <br />
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--surface)', padding: '2px 6px', borderRadius: 3 }}>npm i -g @anthropic-ai/claude-code</code>
            </p>
          </div>
        ) : (
          <div style={S.grid}>
            {projects.map((p) => (
              <div
                key={p.id}
                className="card card-clickable"
                style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}
                onClick={() => onOpenProject(p.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${p.name}`}
                onKeyDown={e => { if (e.key === 'Enter') onOpenProject(p.id); }}
              >
                <div style={S.cardThumb}>🎬</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.cardTitle}>{p.name}</div>
                  <div style={S.cardMeta}>
                    {String(p.config.videoType ?? 'Video')} ·{' '}
                    {String(p.config.orientation ?? '16:9')}
                  </div>
                </div>
                <button
                  style={S.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(p.id);
                  }}
                  aria-label={`Delete ${p.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', height: '100vh', background: 'var(--bg)' },
  sidebar: { background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.2s ease', flexShrink: 0 },
  expandBtn: { width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', border: 'none', background: 'transparent' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  brandMark: { fontSize: 22, color: 'var(--accent)', lineHeight: 1 },
  brandTitle: { fontSize: 15, fontWeight: 700, color: 'var(--fg)' },
  brandSub: { fontSize: 11, color: 'var(--muted)', marginTop: 1 },
  modeToggle: { display: 'flex', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', padding: 3, gap: 2 },
  modeBtn: { flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 500, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--muted)', textAlign: 'center', transition: 'all 0.15s' },
  modeBtnActive: { background: 'var(--bg)', color: 'var(--fg)', boxShadow: 'var(--shadow-sm)' },
  collapseBtn: { color: 'var(--muted)', fontSize: 14, cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px 8px', borderRadius: 'var(--radius-sm)' },
  main: { flex: 1, padding: '32px 40px', overflow: 'auto' },
  heading: { fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--fg)' },
  empty: { padding: '40px 0', maxWidth: 440 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  cardThumb: { fontSize: 24, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardMeta: { fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  deleteBtn: { color: 'var(--muted)', fontSize: 16, cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px 8px', flexShrink: 0, borderRadius: 'var(--radius-sm)' },
};
