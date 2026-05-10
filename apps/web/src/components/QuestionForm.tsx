import { useMemo, useState } from 'react';
import {
  formatQuestionFormAnswers,
  type QuestionFormSpec,
  type QuestionSpec,
} from './question-form-parser';

interface Props {
  id: string;
  title?: string;
  form: QuestionFormSpec;
  disabled?: boolean;
  onSubmit: (message: string) => void;
}

export function QuestionForm({ id, title, form, disabled, onSubmit }: Props) {
  const initialAnswers = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const q of form.questions) {
      if (q.type === 'checkbox') out[q.id] = Array.isArray(q.default) ? q.default.map(String) : [];
      else out[q.id] = q.default !== undefined ? String(q.default) : '';
    }
    return out;
  }, [form.questions]);

  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = !disabled && !submitted && form.questions.every(q => {
    if (!q.required) return true;
    const value = answers[q.id];
    return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
  });

  return (
    <div style={S.card}>
      <div style={S.header}>
        <div>
          <div style={S.title}>{title || 'Quick questions'}</div>
          {form.description && <div style={S.desc}>{form.description}</div>}
        </div>
      </div>

      <div style={S.questions}>
        {form.questions.map(q => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            disabled={disabled || submitted}
            onChange={(value) => setAnswers(prev => ({ ...prev, [q.id]: value }))}
          />
        ))}
      </div>

      <div style={S.footer}>
        {submitted && <span style={S.submitted}>Submitted</span>}
        <button
          style={{ ...S.submit, opacity: canSubmit ? 1 : 0.45 }}
          disabled={!canSubmit}
          onClick={() => {
            onSubmit(formatQuestionFormAnswers(id, answers));
            setSubmitted(true);
          }}
        >
          Submit answers
        </button>
      </div>
    </div>
  );
}

function QuestionField({
  question, value, disabled, onChange,
}: {
  question: QuestionSpec;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  return (
    <label style={S.field}>
      <span style={S.label}>{question.label}{question.required ? ' *' : ''}</span>
      {renderInput(question, value, disabled, onChange)}
    </label>
  );
}

function renderInput(
  question: QuestionSpec,
  value: unknown,
  disabled: boolean | undefined,
  onChange: (value: unknown) => void,
) {
  if (question.type === 'radio') {
    return (
      <div style={S.optionGroup}>
        {(question.options ?? []).map(option => (
          <label key={option} style={S.option}>
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'checkbox') {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div style={S.optionGroup}>
        {(question.options ?? []).map(option => {
          const checked = selected.includes(option);
          return (
            <label key={option} style={S.option}>
              <input
                type="checkbox"
                value={option}
                checked={checked}
                disabled={disabled || (!checked && !!question.maxSelections && selected.length >= question.maxSelections)}
                onChange={() => {
                  onChange(checked ? selected.filter(x => x !== option) : [...selected, option]);
                }}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={S.input}
      >
        <option value="">Select...</option>
        {(question.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  if (question.type === 'textarea') {
    return (
      <textarea
        value={String(value ?? '')}
        disabled={disabled}
        placeholder={question.placeholder}
        onChange={e => onChange(e.target.value)}
        rows={4}
        style={S.textarea}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      disabled={disabled}
      placeholder={question.placeholder}
      onChange={e => onChange(e.target.value)}
      style={S.input}
    />
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  title: { color: 'var(--fg)', fontSize: 13, fontWeight: 700 },
  desc: { color: 'var(--muted)', fontSize: 11, lineHeight: 1.5, marginTop: 4 },
  questions: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: 'var(--fg)', fontSize: 12, fontWeight: 600 },
  optionGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  option: { display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 },
  input: { width: '100%', padding: '7px 9px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--fg)', fontSize: 12 },
  textarea: { width: '100%', padding: '7px 9px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--fg)', fontSize: 12, resize: 'vertical' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  submitted: { color: 'var(--success)', fontSize: 11 },
  submit: { padding: '7px 12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};
