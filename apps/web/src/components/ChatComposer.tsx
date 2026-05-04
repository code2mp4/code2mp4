import { useCallback, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  working?: boolean;
  projectId?: string;
}

export function ChatComposer({ value, onChange, onSend, disabled, working, projectId }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; path: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  }, [value, onSend]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Future: upload dropped files
  }, []);

  const handleAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeAttachment = useCallback((path: string) => {
    setAttachments(prev => prev.filter(a => a.path !== path));
  }, []);

  return (
    <div style={S.composer} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div style={S.attachments}>
          {attachments.map(a => (
            <div key={a.path} style={S.chip}>
              <span style={S.chipIcon}>📎</span>
              <span style={S.chipName}>{a.name}</span>
              <button onClick={() => removeAttachment(a.path)} style={S.chipRemove}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.inputWrap, ...(dragOver ? S.dragActive : {}) }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={working ? 'Agent is working...' : 'Describe your video... (Enter to send, Shift+Enter for new line)'}
          style={S.textarea}
          disabled={disabled || working}
          rows={3}
          aria-label="Message input"
        />
      </div>

      <div style={S.row}>
        <button onClick={handleAttach} style={S.attachBtn} title="Attach files" disabled={disabled}>
          📎
        </button>
        <span style={S.hint}>Enter to send · Shift+Enter new line</span>
        <div style={{ flex: 1 }} />
        {working ? (
          <button onClick={onSend} style={{ ...S.stopBtn }} disabled={!disabled}>
            ⏹ Stop
          </button>
        ) : (
          <button onClick={onSend} disabled={!value.trim() || disabled} style={{ ...S.sendBtn, opacity: value.trim() && !disabled ? 1 : 0.4 }}>
            →
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const files = e.target.files;
          if (files) {
            const newAttachments = Array.from(files).map(f => ({ name: f.name, path: f.name }));
            setAttachments(prev => [...prev, ...newAttachments]);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  composer: { borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  attachments: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 16px 0' },
  chip: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--muted)' },
  chipIcon: { fontSize: 10 },
  chipName: { maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipRemove: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 },
  inputWrap: { padding: '12px 16px 8px' },
  dragActive: { background: 'var(--accent-dim)', borderRadius: 'var(--radius)' },
  textarea: { width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--fg)', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px 12px' },
  attachBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 'var(--radius-sm)' },
  hint: { fontSize: 10, color: 'var(--faint)' },
  sendBtn: { width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', fontSize: 16, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' },
  stopBtn: { width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--danger)', color: '#fff', fontSize: 14, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
