import { useEffect, useState } from 'react';

interface MotionSystem {
  id: string;
  title: string;
  category: string;
  summary: string;
  energy: string;
  swatches: string[];
}

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function MotionSystemPicker({ selectedId, onSelect }: Props) {
  const [systems, setSystems] = useState<MotionSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/motion-systems')
      .then(r => r.json())
      .then(setSystems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.grid}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ ...styles.card, opacity: 0.4 }}>
            <div style={{ ...styles.preview, background: 'var(--surface)' }} />
            <div style={styles.info}>
              <div className="skeleton" style={{ height: 14, width: 100, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, width: 60 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {systems.map(sys => {
        const active = selectedId === sys.id;
        const previewing = previewId === sys.id;
        return (
          <div
            key={sys.id}
            style={{
              ...styles.card,
              ...(active ? styles.cardActive : {}),
            }}
            onClick={() => onSelect(sys.id)}
            onMouseEnter={() => setPreviewId(sys.id)}
            onMouseLeave={() => setPreviewId(null)}
          >
            {/* Swatch bar */}
            <div style={styles.swatchBar}>
              {sys.swatches.slice(0, 5).map((hex, i) => (
                <div
                  key={i}
                  style={{ ...styles.swatch, background: hex }}
                />
              ))}
              {sys.swatches.length === 0 && (
                <div style={{ ...styles.swatch, background: 'var(--surface)' }} />
              )}
            </div>

            {/* Preview iframe (on hover) */}
            {previewing && (
              <div style={styles.previewWrap}>
                <iframe
                  src={`/api/motion-systems/${sys.id}/preview`}
                  style={styles.previewFrame}
                  sandbox="allow-scripts allow-same-origin"
                  title={`${sys.title} preview`}
                />
              </div>
            )}

            {/* Info */}
            <div style={styles.info}>
              <div style={styles.title}>
                {sys.title.replace(' — Motion System', '')}
              </div>
              <div style={styles.meta}>
                <span style={{
                  ...styles.energy,
                  color: sys.energy.includes('high') ? 'var(--warning)'
                        : sys.energy.includes('dramatic') ? 'var(--danger)'
                        : 'var(--success)',
                }}>
                  {sys.energy}
                </span>
                {sys.category && (
                  <span style={styles.category}>{sys.category}</span>
                )}
              </div>
            </div>

            {active && <div style={styles.check}>✓</div>}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 10,
  },
  card: {
    position: 'relative',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  cardActive: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 1px var(--accent-dim)',
  },
  swatchBar: {
    display: 'flex',
    height: 4,
  },
  swatch: {
    flex: 1,
    minWidth: 0,
  },
  previewWrap: {
    width: '100%',
    height: 100,
    overflow: 'hidden',
    background: '#000',
  },
  previewFrame: {
    width: 320,
    height: 180,
    border: 'none',
    transform: 'scale(0.56)',
    transformOrigin: 'top left',
    pointerEvents: 'none',
  },
  info: {
    padding: '10px 12px',
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--fg)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  energy: {
    fontSize: 10,
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  category: {
    fontSize: 10,
    color: 'var(--muted)',
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
