import { useState } from 'react';
import type { VideoProjectConfig } from '@open-video/contracts';
import { MotionSystemPicker } from './MotionSystemPicker';

interface Props {
  onCreate: (name: string, config: VideoProjectConfig) => void;
}

const VIDEO_TYPES = [
  { id: 'product-launch', label: 'Product Launch', icon: '🚀', desc: 'Hero shot, features, CTA — 10-60s' },
  { id: 'social-short', label: 'Social Short', icon: '📱', desc: 'Vertical reel, fast rhythm — 3-15s' },
  { id: 'tutorial', label: 'Tutorial', icon: '📖', desc: 'Step-by-step explainer — 30-120s' },
  { id: 'brand-intro', label: 'Brand Intro', icon: '✨', desc: 'Logo animation opener — 3-10s' },
  { id: 'caption-reel', label: 'Caption Reel', icon: '💬', desc: 'Text-first, music-synced' },
  { id: 'custom', label: 'Custom', icon: '🎬', desc: 'Describe what you want' },
] as const;

const ASPECTS = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '1:1', label: '1:1 Square' },
] as const;

const ENERGIES = [
  { id: 'calm', label: 'Calm / ambient' },
  { id: 'medium', label: 'Medium / editorial' },
  { id: 'high', label: 'High / kinetic' },
  { id: 'dramatic', label: 'Dramatic / cinematic' },
] as const;

const DURATIONS = [
  { id: 5, label: '5s' },
  { id: 10, label: '10s' },
  { id: 15, label: '15s' },
  { id: 30, label: '30s' },
  { id: 60, label: '60s' },
] as const;

export function NewVideoProjectPanel({ onCreate }: Props) {
  const [videoType, setVideoType] = useState<string>('product-launch');
  const [orientation, setOrientation] = useState<string>('16:9');
  const [energy, setEnergy] = useState<string>('medium');
  const [duration, setDuration] = useState<number>(10);
  const [motionSystem, setMotionSystem] = useState<string>('tech');
  const [audioNeeds, setAudioNeeds] = useState<string[]>([]);
  const [copy, setCopy] = useState('');
  const [name, setName] = useState('');

  const handleCreate = () => {
    const projectName = name.trim() || `${videoType} video`;
    onCreate(projectName, {
      videoType,
      orientation: orientation as VideoProjectConfig['orientation'],
      energy,
      duration,
      motionSystemId: motionSystem,
      audioNeeds: audioNeeds.length > 0 ? audioNeeds : undefined,
      copy: copy.trim() || undefined,
    });
  };

  const toggleAudio = (need: string) => {
    setAudioNeeds((prev) =>
      prev.includes(need) ? prev.filter((a) => a !== need) : [...prev, need],
    );
  };

  return (
    <div style={styles.panel}>
      {/* Video type picker */}
      <Section label="Video Type">
        <div style={styles.typeGrid}>
          {VIDEO_TYPES.map((t) => (
            <button
              key={t.id}
              style={{
                ...styles.typeBtn,
                ...(videoType === t.id ? styles.typeBtnActive : {}),
              }}
              onClick={() => setVideoType(t.id)}
            >
              <span style={styles.typeIcon}>{t.icon}</span>
              <span style={styles.typeLabel}>{t.label}</span>
              <span style={styles.typeDesc}>{t.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Aspect ratio */}
      <Section label="Aspect">
        <div style={styles.chipRow}>
          {ASPECTS.map((a) => (
            <Chip
              key={a.id}
              active={orientation === a.id}
              label={a.label}
              onClick={() => setOrientation(a.id)}
            />
          ))}
        </div>
      </Section>

      {/* Duration */}
      <Section label="Duration">
        <div style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Chip
              key={d.id}
              active={duration === d.id}
              label={d.label}
              onClick={() => setDuration(d.id)}
            />
          ))}
        </div>
      </Section>

      {/* Energy */}
      <Section label="Energy">
        <div style={styles.chipRow}>
          {ENERGIES.map((e) => (
            <Chip
              key={e.id}
              active={energy === e.id}
              label={e.label}
              onClick={() => setEnergy(e.id)}
            />
          ))}
        </div>
      </Section>

      {/* Motion system */}
      <Section label="Motion System">
        <MotionSystemPicker
          selectedId={motionSystem}
          onSelect={setMotionSystem}
        />
      </Section>

      {/* Audio */}
      <Section label="Audio">
        <div style={styles.chipRow}>
          {['music', 'voiceover', 'sfx', 'silent'].map((a) => (
            <Chip
              key={a}
              active={audioNeeds.includes(a)}
              label={a}
              onClick={() => toggleAudio(a)}
            />
          ))}
        </div>
      </Section>

      {/* Copy / script */}
      <Section label="Copy">
        <textarea
          placeholder="Paste headlines, script, or bullet points... (optional)"
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          style={styles.textarea}
          rows={4}
        />
      </Section>

      {/* Name */}
      <Section label="Project Name">
        <input
          type="text"
          placeholder={`${videoType} video`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </Section>

      {/* Create button */}
      <button style={styles.createBtn} onClick={handleCreate}>
        Create Video Project
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...styles.chip,
        ...(active ? styles.chipActive : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '16px 20px',
    overflow: 'auto',
    flex: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
    marginBottom: 6,
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  typeBtn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 12px',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s',
  },
  typeBtnActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-dim)',
  },
  typeIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--fg)',
  },
  typeDesc: {
    fontSize: 10,
    color: 'var(--muted)',
    lineHeight: 1.3,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  chipActive: {
    background: 'var(--accent-dim)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--fg)',
    fontSize: 12,
    resize: 'vertical' as const,
    outline: 'none',
  },
  input: {
    width: '100%',
    padding: '6px 10px',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--fg)',
    fontSize: 13,
    outline: 'none',
  },
  createBtn: {
    width: '100%',
    padding: '10px 16px',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    border: 'none',
    marginTop: 4,
  },
};
