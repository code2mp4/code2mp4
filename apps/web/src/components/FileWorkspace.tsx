import { useCallback, useEffect, useState } from 'react';

interface ProjectFile {
  name: string; path: string; size: number; mtime: number;
  kind: 'html' | 'video' | 'image' | 'audio' | 'text' | 'other'; mime: string;
}

interface Props {
  projectId: string;
  onSelectFile?: (file: ProjectFile) => void;
}

const KIND_ICONS: Record<string, string> = { html: '📄', video: '🎬', image: '🖼', audio: '🔊', text: '📝', other: '📎' };

export function FileWorkspace({ projectId, onSelectFile }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<ProjectFile | null>(null);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error('Failed');
      setFiles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadFiles(); const iv = setInterval(loadFiles, 3000); return () => clearInterval(iv); }, [loadFiles]);

  const handleView = useCallback(async (file: ProjectFile) => {
    setSelected(file.path);
    onSelectFile?.(file);
    if (file.kind === 'text' || file.kind === 'html') {
      try {
        const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
        setViewerContent(await res.text());
        setViewerFile(file);
      } catch { setViewerContent('Failed to load file'); setViewerFile(file); }
    } else {
      setViewerFile(file);
      setViewerContent(null);
    }
  }, [projectId, onSelectFile]);

  const handleDownload = useCallback(async (file: ProjectFile) => {
    const res = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(file.path)}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name.split('/').pop() || file.name; a.click();
    URL.revokeObjectURL(url);
  }, [projectId]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files; if (!fileList?.length) return;
    setUploading(true);
    for (const f of Array.from(fileList)) {
      await fetch(`/api/projects/${projectId}/files/${f.name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: await f.text() }) });
    }
    setUploading(false); loadFiles();
    e.target.value = '';
  }, [projectId, loadFiles]);

  const fmt = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>Files</span>
        <span style={S.count}>{files.length}</span>
        <div style={{ flex: 1 }} />
        <label style={S.uploadBtn} title="Upload files">
          {uploading ? '⏳' : '📤'}
          <input type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        <button onClick={loadFiles} style={S.refreshBtn} title="Refresh">↻</button>
      </div>

      {error && <div style={S.err}>{error}<button onClick={loadFiles} style={S.retry}>Retry</button></div>}

      <div style={S.list}>
        {loading && files.length === 0 && <div style={S.empty}>Loading...</div>}
        {!loading && files.length === 0 && <div style={S.empty}><p>No files yet.</p><p style={S.hint}>Generated files appear here.</p></div>}
        {files.map(f => (
          <div key={f.path} style={{ ...S.item, ...(selected === f.path ? S.itemSel : {}) }} onClick={() => handleView(f)}>
            <span style={S.icon}>{KIND_ICONS[f.kind] || '📎'}</span>
            <div style={S.info}>
              <div style={S.name} title={f.name}>{f.name.split('/').pop()}</div>
              <div style={S.meta}>{fmt(f.size)} · {new Date(f.mtime).toLocaleTimeString()}</div>
            </div>
            <button style={S.dlBtn} onClick={e => { e.stopPropagation(); handleDownload(f); }} title="Download">⬇</button>
          </div>
        ))}
      </div>

      {/* File viewer */}
      {viewerFile && (
        <div style={S.viewer}>
          <div style={S.viewerHeader}>
            <span style={S.viewerTitle}>{viewerFile.name.split('/').pop()}</span>
            <button onClick={() => setViewerFile(null)} style={S.viewerClose}>×</button>
          </div>
          <div style={S.viewerBody}>
            {viewerFile.kind === 'video' ? (
              <video src={`/api/projects/${projectId}/files/${encodeURIComponent(viewerFile.path)}`} controls style={{ width: '100%', maxHeight: 200 }} />
            ) : viewerFile.kind === 'image' ? (
              <img src={`/api/projects/${projectId}/files/${encodeURIComponent(viewerFile.path)}`} style={{ width: '100%' }} alt="" />
            ) : viewerFile.kind === 'audio' ? (
              <audio src={`/api/projects/${projectId}/files/${encodeURIComponent(viewerFile.path)}`} controls style={{ width: '100%' }} />
            ) : viewerContent ? (
              <pre style={S.viewerCode}>{viewerContent.slice(0, 5000)}</pre>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12 }}>Binary file · <button onClick={() => handleDownload(viewerFile)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Download</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  title: { fontSize: 11, fontWeight: 600, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  count: { fontSize: 10, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '1px 5px' },
  uploadBtn: { cursor: 'pointer', fontSize: 13, color: 'var(--muted)' },
  refreshBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 'var(--radius-sm)' },
  err: { padding: '6px 12px', fontSize: 11, color: 'var(--danger)', background: 'var(--danger-dim)', display: 'flex', justifyContent: 'space-between' },
  retry: { background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 10, cursor: 'pointer' },
  list: { flex: 1, overflow: 'auto' },
  empty: { padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 },
  hint: { fontSize: 11, opacity: 0.6, marginTop: 4 },
  item: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-soft)' },
  itemSel: { background: 'var(--accent-dim)' },
  icon: { fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 11, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: 9, color: 'var(--faint)', marginTop: 1 },
  dlBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' },
  viewer: { borderTop: '1px solid var(--border)', flexShrink: 0, maxHeight: 280, display: 'flex', flexDirection: 'column' },
  viewerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid var(--border)' },
  viewerTitle: { fontSize: 11, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  viewerClose: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 },
  viewerBody: { overflow: 'auto', flex: 1 },
  viewerCode: { padding: 10, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
};
