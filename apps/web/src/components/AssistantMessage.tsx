import { useState } from 'react';
import { QuestionForm } from './QuestionForm';
import { parseQuestionForms } from './question-form-parser';

interface ToolCall {
  id: string; name: string; input: Record<string, unknown>;
  result?: { content: string; is_error?: boolean };
}

interface Props {
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
  agentName?: string;
  model?: string;
  elapsed?: number;
  tokens?: number;
  working?: boolean;
  status?: string;
  onSubmitQuestionForm?: (message: string) => void;
}

export function AssistantMessage({
  content, toolCalls, thinking, agentName, model, elapsed, tokens, working, status, onSubmitQuestionForm,
}: Props) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);

  // Group tool calls by family
  const toolGroups = groupTools(toolCalls ?? []);

  return (
    <div style={S.msg}>
      {/* Role badge */}
      <div style={S.meta}>
        <span style={S.roleName}>{agentName || 'Agent'}</span>
        {model && <span style={S.model}>{model}</span>}
        <span style={S.time}>{fmtTime(elapsed)}</span>
        {working && <span style={S.dot}>●</span>}
      </div>

      <div style={S.body}>
        {/* Thinking block */}
        {thinking && (
          <div style={S.thinking}>
            <button
              onClick={() => setThinkingOpen(!thinkingOpen)}
              style={S.thinkingToggle}
            >
              <span>✨ Thinking{thinkingOpen ? ' ▾' : ' ▸'}</span>
              <span style={S.thinkingPreview}>{thinking.slice(0, 80)}...</span>
            </button>
            {thinkingOpen && (
              <pre style={S.thinkingBody}>{thinking}</pre>
            )}
          </div>
        )}

        {/* Prose content */}
        {content && (
          renderMessageContent(content, working, onSubmitQuestionForm)
        )}

        {/* Waiting pill */}
        {working && !content && (
          <div style={S.waiting}>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            <span>{status || 'Working...'}</span>
          </div>
        )}

        {/* Tool calls — grouped */}
        {toolGroups.length > 0 && (
          <div style={S.tools}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              style={S.toolsToggle}
            >
              🔧 {toolGroups.map(g => `${g.label} ×${g.items.length}`).join(', ')}
              {toolsOpen ? ' ▾' : ' ▸'}
            </button>
            {toolsOpen && (
              <div style={S.toolsBody}>
                {toolGroups.map((group, gi) => (
                  <div key={gi}>
                    <div style={S.toolGroupLabel}>{group.icon} {group.label} ×{group.items.length}</div>
                    {group.items.map(tc => (
                      <div key={tc.id} style={S.toolItem}>
                        <span style={S.toolName}>{tc.name}</span>
                        <span style={S.toolInput}>
                          {summarizeInput(tc.input)}
                        </span>
                        {tc.result?.is_error && (
                          <span style={S.toolError}>⚠️ Error</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!working && (elapsed || tokens) && (
          <div style={S.footer}>
            {elapsed ? <span>{fmtTime(elapsed)} elapsed</span> : null}
            {tokens ? <span> · {fmtTokens(tokens)} tokens</span> : null}
            <span style={S.footerDot}>{working ? '●' : '○'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderMessageContent(
  text: string,
  working: boolean | undefined,
  onSubmitQuestionForm: ((message: string) => void) | undefined,
) {
  return parseQuestionForms(text).map((segment, i) => {
    if (segment.type === 'form') {
      return (
        <QuestionForm
          key={`${segment.id}-${i}`}
          id={segment.id}
          title={segment.title}
          form={segment.form}
          disabled={working || !onSubmitQuestionForm}
          onSubmit={(message) => onSubmitQuestionForm?.(message)}
        />
      );
    }

    if (!segment.text.trim()) return null;
    return (
      <div key={`text-${i}`} style={S.prose}>
        {renderContent(segment.text)}
      </div>
    );
  });
}

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    const escaped = escapeHtml(line);
    const bolded = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const coded = bolded.replace(/`([^`]+)`/g, '<code>$1</code>');
    return <div key={i} style={{ marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: coded || '&nbsp;' }} />;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summarizeInput(input: Record<string, unknown>): string {
  const text = JSON.stringify(input);
  if (text.length <= 100) return text;
  return text.slice(0, 100) + '…';
}

interface ToolGroup { label: string; icon: string; items: ToolCall[]; }

function groupTools(calls: ToolCall[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  for (const tc of calls) {
    const family = toolFamily(tc.name);
    const last = groups[groups.length - 1];
    if (last && last.label === family.label) {
      last.items.push(tc);
    } else {
      groups.push({ ...family, items: [tc] });
    }
  }
  return groups;
}

function toolFamily(name: string): { label: string; icon: string } {
  const n = name.toLowerCase();
  if (n.includes('write') || n.includes('edit')) return { label: 'Writing', icon: '✎' };
  if (n.includes('read')) return { label: 'Reading', icon: '↗' };
  if (n.includes('bash') || n.includes('exec')) return { label: 'Running', icon: '$' };
  if (n.includes('glob') || n.includes('grep') || n.includes('search')) return { label: 'Searching', icon: '⌕' };
  if (n.includes('todo')) return { label: 'Planning', icon: '☐' };
  if (n.includes('fetch') || n.includes('web')) return { label: 'Fetching', icon: '↬' };
  if (n.includes('ask')) return { label: 'Asking', icon: '?' };
  return { label: 'Tools', icon: '🔧' };
}

function fmtTime(ms?: number): string {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtTokens(n?: number): string {
  if (!n) return '';
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}K`;
}

const S: Record<string, React.CSSProperties> = {
  msg: { maxWidth: '90%', alignSelf: 'flex-start' },
  meta: { display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 4, marginBottom: 4, fontSize: 10, color: 'var(--muted)' },
  roleName: { fontWeight: 600, color: 'var(--accent)' },
  model: { color: 'var(--faint)' },
  time: { color: 'var(--faint)' },
  dot: { color: 'var(--accent)', fontSize: 8, animation: 'pulse 1.5s ease infinite' },
  body: { display: 'flex', flexDirection: 'column', gap: 6 },
  prose: { padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', lineHeight: 1.6, fontSize: 13, color: 'var(--fg)' },
  waiting: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--muted)' },
  thinking: { background: 'var(--accent-dim)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' },
  thinkingToggle: { display: 'flex', gap: 10, alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', textAlign: 'left' },
  thinkingPreview: { color: 'var(--faint)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  thinkingBody: { padding: '8px 12px', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border)' },
  tools: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  toolsToggle: { width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', textAlign: 'left' },
  toolsBody: { padding: '4px 12px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 },
  toolGroupLabel: { fontSize: 10, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  toolItem: { display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, padding: '2px 0' },
  toolName: { color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' },
  toolInput: { color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  toolError: { color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' },
  footer: { display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 4, fontSize: 10, color: 'var(--faint)' },
  footerDot: { fontSize: 8 },
};
