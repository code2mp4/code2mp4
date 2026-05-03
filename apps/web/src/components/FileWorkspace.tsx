import { useCallback, useEffect, useState } from 'react';

interface ProjectFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
  kind: 'html' | 'video' | 'image' | 'audio' | 'text' | 'other';
  mime: string;
}

interface Props {
  projectId: string;
  onSelectFile?: (file: ProjectFile) => void;
  onRefresh?: () => void;
}

const KIND_ICONS: Record<string, string> = {
  html: '📄', video: '🎬', image: '🖼', audio: '🔊', text: '📝', other: '📎',
};

export function FileWorkspace({ projectId, onSelectFile }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadFiles();
    // Poll for file changes every 3 seconds
    const interval = setInterval(loadFiles, 3000);
    return () => clearInterval(interval);
  }, [loadFiles]);

  const handleDownload = useCallback(async (file: ProjectFile) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.split('/').pop() || file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download failed
    }
  }, [projectId]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatTime = (ms: number): string => {
    const date = new Date(ms);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Files</span>
        <span style={styles.count}>{files.length}</span>
        <button onClick={loadFiles} style={styles.refreshBtn} title="Refresh">
          ↻
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
          <button onClick={loadFiles} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      <div style={styles.list}>
        {loading && files.length === 0 && (
          <div style={styles.empty}>Loading...</div>
        )}
        {!loading && files.length === 0 && (
          <div style={styles.empty}>
            <p>No files yet.</p>
            <p style={styles.hint}>Generated files appear here.</p>
          </div>
        )}
        {files.map((file) => (
          <div
            key={file.path}
            style={{
              ...styles.fileItem,
              ...(selected === file.path ? styles.fileItemSelected : {}),
            }}
            onClick={() => {
              setSelected(file.path);
              onSelectFile?.(file);
            }}
          >
            <span style={styles.fileIcon}>{KIND_ICONS[file.kind] ?? '📎'}</span>
            <div style={styles.fileInfo}>
              <div style={styles.fileName} title={file.name}>
                {file.name.split('/').pop()}
              </div>
              <div style={styles.fileMeta}>
                {formatSize(file.size)} · {formatTime(file.mtime)}
                {file.path.includes('/') && (
                  <span style={styles.filePath}>{file.path.split('/').slice(0, -1).join('/')}</span>
                )}
              </div>
            </div>
            <div style={styles.fileActions}>
              <button
                style={styles.actionBtn}
                onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                title="Download"
              >
                ⬇
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'var(--bg)', borderLeft: '1px solid var(--border)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  title: {
    fontSize: 12, fontWeight: 600, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  count: {
    fontSize: 10, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
    padding: '1px 6px',
  },
  refreshBtn: {
    marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)',
    cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
  },
  list: { flex: 1, overflow: 'auto', padding: '4px 0' },
  empty: { padding: 20, textAlign: 'center' as const, color: 'var(--muted)', fontSize: 13 },
  hint: { fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.6 },
  error: {
    padding: '8px 14px', fontSize: 11, color: 'var(--danger)',
    background: 'rgba(229,57,53,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  retryBtn: {
    background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '2px 8px', fontSize: 10, cursor: 'pointer',
  },
  fileItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
    cursor: 'pointer', borderBottom: '1px solid var(--border)',
    transition: 'background 0.1s',
  },
  fileItemSelected: { background: 'var(--accent-dim)' },
  fileIcon: { fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' as const },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: 12, color: 'var(--fg)', whiteSpace: 'nowrap' as const,
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  fileMeta: { fontSize: 10, color: 'var(--muted)', marginTop: 1, display: 'flex', gap: 6, alignItems: 'center' },
  filePath: { opacity: 0.6 },
  fileActions: { display: 'flex', gap: 2, flexShrink: 0 },
  actionBtn: {
    background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
    fontSize: 12, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
  },
};
