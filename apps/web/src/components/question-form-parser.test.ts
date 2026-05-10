import { describe, expect, it } from 'vitest';
import { formatQuestionFormAnswers, parseQuestionForms } from './question-form-parser';

describe('question-form parser', () => {
  it('extracts prose and form JSON from assistant text', () => {
    const segments = parseQuestionForms(`Got it.
<question-form id="video-discovery" title="Video brief">
{
  "description": "A few choices.",
  "questions": [
    { "id": "videoType", "label": "Type", "type": "radio", "required": true, "options": ["Social", "Brand"] },
    { "id": "copy", "label": "Copy", "type": "textarea", "default": "你好" }
  ]
}
</question-form>
Thanks.`);

    expect(segments[0]).toMatchObject({ type: 'text' });
    expect(segments[1]).toMatchObject({ type: 'form', id: 'video-discovery', title: 'Video brief' });
    if (segments[1].type !== 'form') throw new Error('Expected form');
    expect(segments[1].form.questions).toHaveLength(2);
    expect(segments[1].form.questions[0].id).toBe('videoType');
    expect(segments[1].form.questions[1].default).toBe('你好');
    expect(segments[2]).toMatchObject({ type: 'text' });
  });

  it('formats submitted answers in the prompt contract shape', () => {
    expect(formatQuestionFormAnswers('video-discovery', { videoType: 'Brand' })).toBe(
      '[form answers — video-discovery]\n{\n  "videoType": "Brand"\n}',
    );
  });
});
