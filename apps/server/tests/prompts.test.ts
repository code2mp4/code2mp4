import { describe, it, expect } from 'vitest';
import { composeVideoSystemPrompt } from '../src/prompts/system.js';
import { VIDEO_DISCOVERY } from '../src/prompts/video-discovery.js';
import { HYPERFRAMES_CONTRACT } from '../src/prompts/video-contract.js';

describe('composeVideoSystemPrompt', () => {
  it('composes the base prompt with all 4 mandatory layers', () => {
    const result = composeVideoSystemPrompt({});
    // Layer 1: discovery (contains RULE 1)
    expect(result).toContain('RULE 1');
    expect(result).toContain('video-discovery');
    // Layer 3: identity
    expect(result).toContain('expert video producer');
    // Layer 5: HF contract (always pinned last)
    expect(result).toContain('HyperFrames composition contract');
    // Discovery must appear before the contract
    const discIdx = result.indexOf('RULE 1');
    const contractIdx = result.indexOf('HyperFrames composition contract');
    expect(discIdx).toBeLessThan(contractIdx);
  });

  it('injects MOTION.md when provided', () => {
    const motionBody = '# Test System\nCanvas: #FFF\nAccent: #F00';
    const result = composeVideoSystemPrompt({
      motionSystemBody: motionBody,
      motionSystemTitle: 'Test System',
    });
    expect(result).toContain('Active motion design system');
    expect(result).toContain('Test System');
    expect(result).toContain('# Test System');
    expect(result).toContain('authoritative');
  });

  it('injects SKILL.md with preflight when provided', () => {
    const skillBody = 'Follow this workflow.\nRead references/storyboard.md first.';
    const result = composeVideoSystemPrompt({
      skillBody,
      skillName: 'product-launch-video',
    });
    expect(result).toContain('Active skill');
    expect(result).toContain('product-launch-video');
    expect(result).toContain('Pre-flight');
  });

  it('renders project metadata block when provided', () => {
    const result = composeVideoSystemPrompt({
      metadata: {
        videoType: 'social-short',
        duration: 8,
        orientation: '9:16',
        energy: 'high',
      },
    });
    expect(result).toContain('Project metadata');
    expect(result).toContain('social-short');
    expect(result).toContain('9:16');
    expect(result).toContain('high');
    expect(result).toContain('HyperFrames video');
  });

  it('includes user copy in metadata when provided', () => {
    const result = composeVideoSystemPrompt({
      metadata: { copy: 'Buy our product today' },
    });
    expect(result).toContain('User-provided copy');
    expect(result).toContain('Buy our product today');
  });

  it('pins the HF contract at the very end', () => {
    const result = composeVideoSystemPrompt({
      skillBody: 'Some skill content',
      motionSystemBody: '# Motion system',
      metadata: { duration: 10 },
    });
    // HF contract is the last major section — the suffix after it is minimal
    const lastIdx = result.lastIndexOf('HyperFrames composition contract');
    const suffixLen = result.length - lastIdx;
    // Contract itself is ~6KB, suffix should be close to that
    expect(suffixLen).toBeLessThan(7000);
  });
});

describe('video-discovery prompt', () => {
  it('contains the RULE 1 discovery form directive', () => {
    expect(VIDEO_DISCOVERY).toContain('RULE 1');
    expect(VIDEO_DISCOVERY).toContain('video-discovery');
    expect(VIDEO_DISCOVERY).toContain('question-form');
  });

  it('contains all 7 discovery questions', () => {
    expect(VIDEO_DISCOVERY).toContain('videoType');
    expect(VIDEO_DISCOVERY).toContain('duration');
    expect(VIDEO_DISCOVERY).toContain('orientation');
    expect(VIDEO_DISCOVERY).toContain('energy');
    expect(VIDEO_DISCOVERY).toContain('audio');
    expect(VIDEO_DISCOVERY).toContain('motion_system');
    expect(VIDEO_DISCOVERY).toContain('copy');
  });

  it('contains branch logic for RULE 2', () => {
    expect(VIDEO_DISCOVERY).toContain('RULE 2');
    expect(VIDEO_DISCOVERY).toContain('Branch A');
    expect(VIDEO_DISCOVERY).toContain('Branch B');
  });

  it('contains anti-AI-slop checklist for video', () => {
    expect(VIDEO_DISCOVERY).toContain('Anti-AI-slop');
    expect(VIDEO_DISCOVERY).toContain('Default dark gradient');
    expect(VIDEO_DISCOVERY).toContain('Inter / Roboto');
  });
});

describe('video-contract prompt', () => {
  it('contains environment variable documentation', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('OD_PROJECT_DIR');
    expect(HYPERFRAMES_CONTRACT).toContain('OD_BIN');
  });

  it('contains the fast path scaffold instructions', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('hyperframes init');
    expect(HYPERFRAMES_CONTRACT).toContain('--example blank');
    expect(HYPERFRAMES_CONTRACT).toContain('.hf-cache');
  });

  it('contains render dispatch instructions', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('media generate');
    expect(HYPERFRAMES_CONTRACT).toContain('hyperframes-html');
  });

  it('contains the data attribute cheat sheet', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('data-composition-id');
    expect(HYPERFRAMES_CONTRACT).toContain('data-start');
    expect(HYPERFRAMES_CONTRACT).toContain('data-duration');
    expect(HYPERFRAMES_CONTRACT).toContain('data-track-index');
    expect(HYPERFRAMES_CONTRACT).toContain('data-type="text"');
  });

  it('contains the output checklist', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('hyperframes lint');
    expect(HYPERFRAMES_CONTRACT).toContain('hyperframes validate');
    expect(HYPERFRAMES_CONTRACT).toContain('hyperframes inspect');
    expect(HYPERFRAMES_CONTRACT).toContain('window.__timelines');
  });
});
