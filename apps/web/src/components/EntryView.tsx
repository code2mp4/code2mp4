import { useState } from 'react';
import type { VideoProjectConfig } from '@open-video/contracts';
import { NewVideoProjectPanel } from './NewVideoProjectPanel';

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
}

export function EntryView({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.shell}>
      {/* Left sidebar — new project creator */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 48 : 360 }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} style={styles.expandBtn}>
            +
          </button>
        ) : (
          <>
            <div style={styles.brand}>
              <span style={styles.brandMark}>◈</span>
              <div>
                <div style={styles.brandTitle}>Open Video</div>
                <div style={styles.brandSub}>AI Video Production</div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                style={styles.collapseBtn}
                aria-label="Collapse sidebar"
              >
                «
              </button>
            </div>
            <NewVideoProjectPanel onCreate={onCreateProject} />
          </>
        )}
      </aside>

      {/* Main content — recent projects */}
      <main style={styles.main}>
        <h2 style={styles.heading}>Recent Videos</h2>
        {projects.length === 0 ? (
          <div style={styles.empty}>
            <p>Create your first AI-powered video.</p>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Pick a video type from the sidebar, describe what you want, and
              the AI agent will produce a HyperFrames composition rendered to
              MP4.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={styles.card}
                onClick={() => onOpenProject(p.id)}
              >
                <div style={styles.cardThumb}>🎬</div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTitle}>{p.name}</div>
                  <div style={styles.cardMeta}>
                    {String(p.config.videoType ?? 'Video')} ·{' '}
                    {String(p.config.orientation ?? '16:9')}
                  </div>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(p.id);
                  }}
                  aria-label="Delete project"
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

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg)',
  },
  sidebar: {
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 0.2s ease',
    flexShrink: 0,
  },
  expandBtn: {
    width: '100%',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted)',
    fontSize: 18,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  brandMark: {
    fontSize: 22,
    color: 'var(--accent)',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--fg)',
  },
  brandSub: {
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 1,
  },
  collapseBtn: {
    marginLeft: 'auto',
    color: 'var(--muted)',
    fontSize: 14,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: '4px 8px',
  },
  main: {
    flex: 1,
    padding: 32,
    overflow: 'auto',
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    color: 'var(--fg)',
  },
  empty: {
    padding: '40px 0',
    maxWidth: 420,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 16,
    cursor: 'pointer',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    transition: 'border-color 0.15s',
  },
  cardThumb: {
    fontSize: 28,
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-hover)',
    borderRadius: 'var(--radius)',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--fg)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 2,
  },
  deleteBtn: {
    color: 'var(--muted)',
    fontSize: 18,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: '4px 8px',
    flexShrink: 0,
    borderRadius: 'var(--radius-sm)',
  },
};
