import { useState } from 'react';

interface Props {
  onCreate: (name: string, prompt: string) => void;
}

const EXAMPLES = [
  { label: 'Product launch', text: '15-second product launch video for a minimalist coffee mug. Warm lighting, slow reveal, feature callouts.' },
  { label: 'Social reel', text: '8-second vertical reel for a fitness app. Fast cuts, bold text, energetic music.' },
  { label: 'Brand intro', text: '5-second brand opener for a tech startup. Dark canvas, neon accent, logo animation.' },
  { label: 'Tutorial', text: '60-second tutorial: how to deploy a Next.js app. Step-by-step, clean UI, code blocks.' },
];

export function QuickChatPanel({ onCreate }: Props) {
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);

  const handleSend = () => {
    const text = input.trim();
    if (!text || working) return;
    setWorking(true);
    const name = text.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Quick Video';
    onCreate(name, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.icon}>💬</span>
        <span>Describe your video</span>
      </div>

      <p style={S.hint}>
        Tell the AI what you want — it'll figure out the type, duration, style, and music.
      </p>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. A 15-second tech product launch video with dark background and signal blue accents..."
        style={S.textarea}
        rows={5}
        disabled={working}
        autoFocus
      />

      <button
        onClick={handleSend}
        disabled={!input.trim() || working}
        style={{ ...S.sendBtn, opacity: input.trim() && !working ? 1 : 0.5 }}
      >
        {working ? 'Creating...' : 'Create Video →'}
      </button>

      <div style={S.examples}>
        <div style={S.examplesTitle}>Try an example</div>
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => {
              setInput(ex.text);
              setTimeout(() => handleSend(), 100);
            }}
            style={S.exampleBtn}
            disabled={working}
          >
            <span style={S.exampleLabel}>{ex.label}</span>
            <span style={S.exampleText}>{ex.text.slice(0, 60)}...</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--fg)' },
  icon: { fontSize: 18 },
  hint: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 },
  textarea: {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--fg)',
    fontSize: 12, resize: 'none', outline: 'none',
    fontFamily: 'inherit', lineHeight: 1.5,
  },
  sendBtn: {
    width: '100%', padding: '10px 16px',
    background: 'var(--accent)', color: '#fff',
    fontSize: 13, fontWeight: 600,
    borderRadius: 'var(--radius)', cursor: 'pointer',
    border: 'none', transition: 'opacity 0.15s',
  },
  examples: { marginTop: 8 },
  examplesTitle: { fontSize: 10, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  exampleBtn: {
    display: 'flex', flexDirection: 'column', gap: 2,
    width: '100%', padding: '8px 10px', marginBottom: 4,
    background: 'var(--surface-hover)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    textAlign: 'left', fontSize: 11,
  },
  exampleLabel: { color: 'var(--accent)', fontWeight: 600 },
  exampleText: { color: 'var(--muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
