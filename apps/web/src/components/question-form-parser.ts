export type QuestionType = 'radio' | 'checkbox' | 'select' | 'text' | 'textarea';

export interface QuestionSpec {
  id: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  maxSelections?: number;
  options?: string[];
  placeholder?: string;
  default?: unknown;
}

export interface QuestionFormSpec {
  description?: string;
  questions: QuestionSpec[];
}

export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'form'; id: string; title?: string; form: QuestionFormSpec };

export function parseQuestionForms(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const re = /<question-form\b([^>]*)>([\s\S]*?)<\/question-form>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const attrs = parseAttrs(match[1] ?? '');
    const body = stripCodeFence(match[2] ?? '').trim();
    const parsed = parseFormJson(body);
    if (parsed) {
      segments.push({
        type: 'form',
        id: attrs.id || 'question-form',
        title: attrs.title,
        form: parsed,
      });
    } else {
      segments.push({ type: 'text', text: match[0] });
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text }];
}

export function formatQuestionFormAnswers(formId: string, answers: Record<string, unknown>): string {
  return `[form answers — ${formId}]\n${JSON.stringify(answers, null, 2)}`;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1] ?? raw;
}

function parseFormJson(raw: string): QuestionFormSpec | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.questions)) return null;
    const questions = parsed.questions
      .map(normalizeQuestion)
      .filter((q: QuestionSpec | null): q is QuestionSpec => q !== null);
    if (questions.length === 0) return null;
    return {
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      questions,
    };
  } catch {
    return null;
  }
}

function normalizeQuestion(raw: unknown): QuestionSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const id = typeof q.id === 'string' ? q.id : '';
  const label = typeof q.label === 'string' ? q.label : id;
  const type = typeof q.type === 'string' ? q.type : '';
  if (!id || !isQuestionType(type)) return null;
  return {
    id,
    label,
    type,
    required: q.required === true,
    maxSelections: typeof q.maxSelections === 'number' ? q.maxSelections : undefined,
    options: Array.isArray(q.options) ? q.options.map(String) : undefined,
    placeholder: typeof q.placeholder === 'string' ? q.placeholder : undefined,
    default: q.default,
  };
}

function isQuestionType(type: string): type is QuestionType {
  return type === 'radio' || type === 'checkbox' || type === 'select' || type === 'text' || type === 'textarea';
}
