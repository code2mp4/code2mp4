import { useEffect, useState } from 'react';

interface MusicTrack {
  id: string; title: string; style: string; mood: string;
  bpm: number; durationSec: number; license: string; attribution: string;
  tags: string[]; size: number;
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const STYLE_LABELS: Record<string, string> = {
  ambient: 'Ambient', cinematic: 'Cinematic', corporate: 'Corporate',
};

const MOOD_LABELS: Record<string, string> = {
  calm: 'Calm', dramatic: 'Dramatic', energetic: 'Energetic',
};

export function MusicPicker({ selectedId, onSelect }: Props) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/music')
      .then(r => r.json())
      .then(setTracks)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={S.grid}>
        {[1,2,3].map(i => (
          <div key={i} style={S.card}>
            <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 10, width: 50 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={S.grid}>
      {/* None option */}
      <div
        style={{ ...S.card, ...(!selectedId ? S.cardActive : {}) }}
        onClick={() => onSelect(null)}
      >
        <div style={S.nonePreview}>🔇</div>
        <div style={S.info}>
          <div style={S.title}>No Music</div>
          <div style={S.meta}>Silent / SFX only</div>
        </div>
        {!selectedId && <div style={S.check}>✓</div>}
      </div>

      {tracks.map(t => {
        const active = selectedId === t.id;
        return (
          <div
            key={t.id}
            style={{ ...S.card, ...(active ? S.cardActive : {}) }}
            onClick={() => onSelect(t.id)}
          >
            <div style={S.preview}>
              <span style={S.playIcon}>♪</span>
            </div>
            <div style={S.info}>
              <div style={S.title}>{t.title}</div>
              <div style={S.meta}>
                <span>{STYLE_LABELS[t.style] || t.style}</span>
                <span>·</span>
                <span>{MOOD_LABELS[t.mood] || t.mood}</span>
                <span>·</span>
                <span>{t.bpm}bpm</span>
              </div>
              <div style={S.attr}>{t.attribution.slice(0, 50)}</div>
            </div>
            {active && <div style={S.check}>✓</div>}
          </div>
        );
      })}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 },
  card: {
    position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer',
    display: 'flex', gap: 10, alignItems: 'center',
    transition: 'border-color 0.15s',
  },
  cardActive: { borderColor: 'var(--accent)', background: 'var(--accent-dim)' },
  nonePreview: {
    width: 40, height: 40, borderRadius: 'var(--radius)',
    background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  },
  preview: {
    width: 40, height: 40, borderRadius: 'var(--radius)',
    background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  playIcon: { fontSize: 16, color: 'var(--accent)' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: 10, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 4 },
  attr: { fontSize: 9, color: 'var(--faint)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  check: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
