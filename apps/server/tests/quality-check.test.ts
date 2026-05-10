import { describe, it, expect } from 'vitest';
import { checkVideoQuality } from '../src/quality-check.js';

function makeScene(id: string, number: number, duration: number, text: string) {
  return { id, number, duration, goal: 'Test goal', visual: 'Test visual', text, motion: 'Test motion' };
}

const validStoryboard = {
  title: 'Test Video',
  duration: 30,
  aspectRatio: '16:9' as const,
  scenes: [
    makeScene('hook', 1, 4, 'Deploying should not take hours.'),
    makeScene('feature-1', 2, 8, 'One-click deploy. Connect your repo, pick a branch.'),
    makeScene('feature-2', 3, 8, 'Instant rollback if something breaks.'),
    makeScene('feature-3', 4, 6, 'Preview environments before merging.'),
    makeScene('cta', 5, 4, 'Start deploying in 60 seconds.'),
  ],
};

const validBrief = {
  id: 'test',
  goal: { primary: 'test', secondary: 'test' },
  audience: { who: 'devs', context: 'web', awareness: 'problem-aware' as const },
  format: { primary: '16:9' as const, duration: 30 },
  motionSystem: 'tech' as const,
  branding: { colors: { primary: '#58A6FF' } },
};

describe('checkVideoQuality', () => {
  it('passes a well-formed storyboard', () => {
    const report = checkVideoQuality('test-video', validStoryboard, validBrief);
    expect(report.passed).toBe(true);
    expect(report.errors.length).toBe(0);
  });

  it('fails on empty storyboard', () => {
    const report = checkVideoQuality('empty', {
      title: '',
      duration: 0,
      aspectRatio: '16:9',
      scenes: [],
    });
    expect(report.passed).toBe(false);
  });

  it('flags AI phrases in scene text', () => {
    const report = checkVideoQuality('ai-phrases', {
      title: 'AI Video',
      duration: 15,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 3, 'In today\'s fast-paced world, deploying is revolutionary.'),
        makeScene('cta', 2, 12, 'Try our groundbreaking platform today.'),
      ],
    });
    expect(report.dimensions.script.checks.some(c => c.id === 'no-ai-phrases' && !c.passed)).toBe(true);
  });

  it('flags long hook text (>15 words)', () => {
    const report = checkVideoQuality('long-hook', {
      title: 'Wordy',
      duration: 20,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 4, 'This is a very long hook that has too many words in it and will not be readable in three seconds'),
        makeScene('cta', 2, 16, 'CTA'),
      ],
    });
    expect(report.dimensions.hook.checks.some(c => c.id === 'hook-words' && !c.passed)).toBe(true);
  });

  it('flags hook duration > 5s', () => {
    const report = checkVideoQuality('slow-hook', {
      title: 'Slow',
      duration: 20,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 8, 'Hook'),
        makeScene('cta', 2, 12, 'CTA'),
      ],
    });
    expect(report.dimensions.hook.checks.some(c => c.id === 'hook-duration' && !c.passed)).toBe(true);
  });

  it('flags text-per-screen > 80 chars', () => {
    const longText = 'This text is way too long for a video screen because it contains more than eighty characters and will overflow or become unreadable on most displays at standard font sizes';
    const report = checkVideoQuality('text-overflow', {
      title: 'Overflow',
      duration: 15,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 5, 'Hook line'),
        makeScene('cta', 2, 10, longText),
      ],
    });
    expect(report.dimensions.readability.checks.some(c => c.id === 'text-per-screen' && !c.passed)).toBe(true);
  });

  it('flags forced <br> tags', () => {
    const report = checkVideoQuality('br-tags', {
      title: 'BR Tags',
      duration: 15,
      aspectRatio: '16:9',
      scenes: [
        makeScene('hook', 1, 5, 'Line one<br>Line two<br>Line three'),
        makeScene('cta', 2, 10, 'CTA'),
      ],
    });
    expect(report.dimensions.readability.checks.some(c => c.id === 'no-br-tags' && !c.passed)).toBe(true);
  });

  it('checks platform duration against brief distribution', () => {
    const report = checkVideoQuality('platform-check',
      { ...validStoryboard, duration: 120 },
      {
        id: 'test',
        goal: { primary: 'test', secondary: 'test' },
        audience: { who: 'devs', context: 'web', awareness: 'problem-aware' },
        format: { primary: '16:9', duration: 120 },
        distribution: { platforms: ['tiktok', 'github'] },
      },
    );
    // 120s is outside TikTok's 15-60s range
    expect(report.dimensions.platform.checks.some(c => c.id === 'platform-duration-tiktok' && !c.passed)).toBe(true);
    // 120s is also outside GitHub's 15-60s range
    expect(report.dimensions.platform.checks.some(c => c.id === 'platform-duration-github' && !c.passed)).toBe(true);
  });

  it('flags missing motion system when brief has none', () => {
    const report = checkVideoQuality('no-motion',
      validStoryboard,
      {
        id: 'test',
        goal: { primary: 'test', secondary: 'test' },
        audience: { who: 'devs', context: 'web', awareness: 'problem-aware' },
        format: { primary: '16:9', duration: 30 },
      },
    );
    expect(report.dimensions.brand.checks.some(c => c.id === 'motion-system-missing' && !c.passed)).toBe(true);
  });

  it('computes scores for passing video', () => {
    const report = checkVideoQuality('scored', validStoryboard, validBrief);
    expect(report.scores.overall).toBeGreaterThan(70);
    expect(report.scores.hook).toBe(100);
  });
});
