import { useEffect, useState } from 'react';

export interface AgentInfo {
  id: string;
  name: string;
  detected: boolean;
  version?: string;
  models: Array<{ id: string; label: string }>;
}

interface Props {
  onSelectAgent: (agentId: string) => void;
  selectedAgentId: string | null;
}

export function AgentPicker({ onSelectAgent, selectedAgentId }: Props) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(d => setAgents(d.agents || []))
      .finally(() => setLoading(false));
  }, []);

  const detected = agents.filter(a => a.detected);
  const selected = agents.find(a => a.id === selectedAgentId);

  if (loading) {
    return (
      <div style={S.picker}>
        <span className="skeleton" style={{ width: 80, height: 20, display: 'inline-block', borderRadius: 3 }} />
      </div>
    );
  }

  return (
    <div style={S.picker}>
      <button
        onClick={() => setOpen(!open)}
        style={S.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={S.dot} />
        <span style={S.name}>{selected?.name || 'No agent'}</span>
        <span style={S.arrow}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <>
          <div style={S.backdrop} onClick={() => setOpen(false)} />
          <div style={S.dropdown} role="listbox">
            <div style={S.header}>
              <span>AI Agents</span>
              <span style={S.count}>{detected.length} detected</span>
            </div>
            {agents.map(agent => (
              <button
                key={agent.id}
                role="option"
                aria-selected={agent.id === selectedAgentId}
                style={{
                  ...S.option,
                  ...(agent.id === selectedAgentId ? S.optionActive : {}),
                  ...(!agent.detected ? S.optionDisabled : {}),
                }}
                onClick={() => {
                  if (agent.detected) {
                    onSelectAgent(agent.id);
                    setOpen(false);
                  }
                }}
                disabled={!agent.detected}
              >
                <span style={S.optDot}>
                  <span style={{
                    ...S.optDotInner,
                    background: agent.detected ? 'var(--success)' : 'var(--muted)',
                  }} />
                </span>
                <div style={S.optInfo}>
                  <div style={S.optName}>
                    {agent.name}
                    {!agent.detected && <span style={S.optMissing}>not installed</span>}
                  </div>
                  {agent.version && (
                    <div style={S.optVer}>{agent.version}</div>
                  )}
                </div>
              </button>
            ))}
            {detected.length === 0 && (
              <div style={S.empty}>
                <p>No AI agents detected.</p>
                <p style={S.hint}>Install one: <code>npm i -g @anthropic-ai/claude-code</code></p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  picker: { position: 'relative', zIndex: 100 },
  trigger: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--fg)',
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--success)', flexShrink: 0,
  },
  name: { fontWeight: 500 },
  arrow: { fontSize: 8, color: 'var(--muted)' },
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 99,
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
    width: 240, maxHeight: 320, overflow: 'auto',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 101,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--muted)',
  },
  count: { color: 'var(--accent)', fontWeight: 400 },
  option: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 12px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    textAlign: 'left', color: 'var(--fg)', fontSize: 13,
  },
  optionActive: { background: 'var(--accent-dim)' },
  optionDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  optDot: { width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' },
  optDotInner: { width: 6, height: 6, borderRadius: '50%', display: 'inline-block' },
  optInfo: { flex: 1, minWidth: 0 },
  optName: { fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' },
  optMissing: { fontSize: 9, color: 'var(--muted)', fontStyle: 'italic' },
  optVer: { fontSize: 9, color: 'var(--faint)', marginTop: 1 },
  empty: { padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 },
  hint: { fontSize: 10, marginTop: 4, color: 'var(--faint)' },
};
