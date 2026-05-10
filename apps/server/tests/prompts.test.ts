import { describe, it, expect } from 'vitest';
import { composeVideoSystemPrompt } from '../src/prompts/system.js';
import { VIDEO_DISCOVERY } from '../src/prompts/video-discovery.js';
import { HYPERFRAMES_CONTRACT } from '../src/prompts/video-contract.js';

describe('composeVideoSystemPrompt', () => {
  it('composes compact prompt with discovery + identity + contract', () => {
    const result = composeVideoSystemPrompt({});
    expect(result).toContain('RULE 1');
    expect(result).toContain('expert video producer');
    expect(result).toContain('class="clip" REQUIRED');
    expect(result.length).toBeLessThan(25000); // should be compact
  });

  it('injects compact MOTION.md tokens', () => {
    const motionBody = '# Tech System\n\n## Color Palette\n- **Canvas (background):** `#0D1117`\n- **Primary accent:** `#58A6FF`\n- **Secondary accent:** `#3FB950`\n\n## Typography\n- **Display font:** JetBrains Mono\n- **Body font:** Inter\n\n## Easing Signatures\n- **Entrance (headlines):** `power3.out`\n- **Exit:** `power2.in`\n\n## Transition Matrix\n- **Default (scene→scene):** Grid dissolve\n\nHeadlines: 72-100px';
    const result = composeVideoSystemPrompt({ motionSystemBody: motionBody, motionSystemTitle: 'tech' });
    expect(result).toContain('Active motion system');
    expect(result).toContain('#0D1117');
    expect(result).toContain('#58A6FF');
    expect(result).toContain('JetBrains Mono');
    expect(result).toContain('power3.out');
    // Should NOT contain the full body
    expect(result).not.toContain('Transition Matrix');
  });

  it('injects SCRIPT.md compact summary', () => {
    const result = composeVideoSystemPrompt({ scriptSystemBody: 'Hook→Context→Features→Proof→CTA', scriptSystemTitle: 'tech-demo' });
    expect(result).toContain('Active script system');
    expect(result).toContain('Hook→Context→Features→Proof→CTA');
    expect(result).toContain('SCRIPT.md at:');
  });

  it('injects skill hints (not full body)', () => {
    const skillBody = '3-5 scenes. Pattern A: Type reveal. Pattern B: Scale lock.';
    const result = composeVideoSystemPrompt({ skillBody, skillName: 'product-launch' });
    expect(result).toContain('Active skill');
    expect(result).toContain('product-launch');
    // Should be compact hints, not full body
    expect(result.length).toBeLessThan(25000);
  });

  it('renders project metadata', () => {
    const result = composeVideoSystemPrompt({
      metadata: { videoType: 'social-short', duration: 8, orientation: '9:16' },
    });
    expect(result).toContain('Project metadata');
    expect(result).toContain('social-short');
  });

  it('pins the contract at the end', () => {
    const result = composeVideoSystemPrompt({});
    const idx = result.lastIndexOf('class="clip" REQUIRED');
    expect(idx).toBeGreaterThan(0);
    expect(result.length - idx).toBeLessThan(5000);
  });
});

describe('video-discovery prompt', () => {
  it('contains RULE 1 discovery form', () => {
    expect(VIDEO_DISCOVERY).toContain('RULE 1');
    expect(VIDEO_DISCOVERY).toContain('video-discovery');
  });

  it('contains RULE 2 branch logic', () => {
    expect(VIDEO_DISCOVERY).toContain('RULE 2');
    expect(VIDEO_DISCOVERY).toContain('Branch A');
  });
});

describe('video-contract prompt', () => {
  it('contains all critical rules', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('class="clip" REQUIRED');
    expect(HYPERFRAMES_CONTRACT).toContain('data-composition-id ONLY on #stage');
    expect(HYPERFRAMES_CONTRACT).toContain('track-index overlap');
    expect(HYPERFRAMES_CONTRACT).toContain('width=device-width');
    expect(HYPERFRAMES_CONTRACT).toContain('window.__timelines');
    expect(HYPERFRAMES_CONTRACT).toContain('paused: true');
    expect(HYPERFRAMES_CONTRACT).toContain('Math.random()');
    expect(HYPERFRAMES_CONTRACT).toContain('muted playsinline');
    expect(HYPERFRAMES_CONTRACT).toContain('Font sizes');
    expect(HYPERFRAMES_CONTRACT).toContain('Palette must match');
    expect(HYPERFRAMES_CONTRACT).toContain('Scene transitions');
    // New rules
    expect(HYPERFRAMES_CONTRACT).toContain('getVariables');
    expect(HYPERFRAMES_CONTRACT).toContain('data-composition-variables');
    expect(HYPERFRAMES_CONTRACT).toContain('Sub-compositions');
    expect(HYPERFRAMES_CONTRACT).toContain('inspect');
    expect(HYPERFRAMES_CONTRACT).toContain('gsap.set');
    expect(HYPERFRAMES_CONTRACT).toContain('<br>');
  });

  it('is compact (< 4000 chars)', () => {
    expect(HYPERFRAMES_CONTRACT.length).toBeLessThan(4000);
  });

  it('references disk for full docs', () => {
    expect(HYPERFRAMES_CONTRACT).toContain('Read tool');
  });
});
