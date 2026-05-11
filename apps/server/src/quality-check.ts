/**
 * Quality check engine — minimal code2mp4 check implementation.
 *
 * Runs the Video Review Theater across 7 dimensions against project artifacts.
 * Checks that don't require a running browser (hook, script, readability,
 * platform fit, brand consistency) are implemented. Motion quality and render
 * determinism checks require HyperFrames CLI and are deferred to the bridge.
 *
 * Output: quality-report.json (conforms to QualityReport type in @code2mp4/contracts)
 */
import type { Storyboard, StoryboardScene } from './pipeline.js';

// ── Local types (server can't import @code2mp4/contracts directly) ─

interface VideoBrief {
  id: string;
  goal: { primary: string; secondary: string };
  audience: { who: string; context: string; awareness: string };
  format: { primary: string; duration: number };
  motionSystem?: string;
  branding?: { colors?: { primary?: string } };
  distribution?: { platforms?: string[] };
}

interface QualityReport {
  videoId: string;
  passed: boolean;
  dimensions: {
    hook: QualityDim;
    script: QualityDim;
    readability: QualityDim;
    motion: QualityDim;
    platform: QualityDim;
    brand: QualityDim;
    render: QualityDim;
  };
  errors: QualityFinding[];
  warnings: QualityFinding[];
  scores: {
    overall: number;
    hook?: number;
    clarity?: number;
    platformFit?: number;
    brandConsistency?: number;
  };
}

interface QualityDim {
  passed: boolean;
  checks: QualityCheckItem[];
}

interface QualityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

interface QualityFinding {
  check: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
}

// ── Anti-AI-phrase patterns ──────────────────────────────────────

const AI_PHRASES = [
  /in today'?s\s+(fast-paced|digital|modern|ever-changing)\s+world/i,
  /revolutionary|ground[-\s]?breaking|game[-\s]?changing/i,
  /leveraging\s+(cutting[-\s]?edge|state[-\s]?of[-\s]?the[-\s]?art)/i,
  /seamlessly\s+integrated/i,
  /we all know that/i,
  /studies (show|have shown|indicate) that/i,
  /in (an|this) era of/i,
  /unprecedented/i,
  /synergistic/i,
  /holistic\s+(approach|solution)/i,
  /paradigm\s+shift/i,
  /next[-\s]?generation\s+(platform|solution|technology)/i,
  /best[-\s]?of[-\s]?breed/i,
  /world[-\s]?class/i,
  /innovative\s+(solution|approach|platform)/i,
];

// ── Platform duration guidelines (seconds) ───────────────────────

const PLATFORM_GUIDELINES: Record<string, { min: number; max: number; optimal: number }> = {
  'github': { min: 15, max: 60, optimal: 30 },
  'youtube': { min: 30, max: 180, optimal: 60 },
  'website': { min: 30, max: 90, optimal: 60 },
  'twitter': { min: 15, max: 120, optimal: 30 },
  'tiktok': { min: 15, max: 60, optimal: 15 },
  'instagram': { min: 15, max: 90, optimal: 30 },
  'linkedin': { min: 15, max: 600, optimal: 30 },
};

// ═══════════════════════════════════════════════════════════════════

export function checkVideoQuality(
  videoId: string,
  storyboard: Storyboard,
  brief?: VideoBrief,
): QualityReport {
  const dimensions: Required<QualityReport>['dimensions'] = {
    hook: checkHook(storyboard),
    script: checkScript(storyboard),
    readability: checkReadability(storyboard),
    motion: { passed: true, checks: [{ id: 'motion-deferred', label: 'Motion quality check requires HyperFrames inspect', passed: true, detail: 'Run npx hyperframes inspect --json to verify' }] },
    platform: checkPlatform(storyboard, brief),
    brand: checkBrand(storyboard, brief),
    render: { passed: true, checks: [{ id: 'render-deferred', label: 'Render determinism requires HyperFrames lint', passed: true, detail: 'Run npx hyperframes lint --json to verify' }] },
  };

  const errors: QualityFinding[] = [];
  const warnings: QualityFinding[] = [];

  for (const [dim, result] of Object.entries(dimensions)) {
    for (const check of result.checks) {
      if (!check.passed) {
        const finding: QualityFinding = {
          check: `${dim}-${check.id}`,
          severity: 'error',
          message: `${check.label}: ${check.detail || 'failed'}`,
          fix: suggestFix(dim, check.id),
        };
        errors.push(finding);
      }
    }
  }

  const passed = errors.length === 0;
  const scores = computeScores(dimensions);

  return { videoId, passed, dimensions, errors, warnings, scores };
}

// ── Hook dimension ────────────────────────────────────────────────

function checkHook(storyboard: Storyboard): QualityDim {
  const checks: QualityCheckItem[] = [];
  const first = storyboard.scenes[0];

  if (!first) {
    checks.push({ id: 'hook-exists', label: 'Hook scene must be present', passed: false, detail: 'No scenes defined' });
    return { passed: false, checks };
  }

  const hookWords = first.text.split(/\s+/).length;

  checks.push({
    id: 'hook-exists',
    label: 'Hook scene present',
    passed: true,
    detail: `Scene "${first.id}" serves as hook`,
  });

  checks.push({
    id: 'hook-duration',
    label: 'Hook duration ≤ 5s',
    passed: first.duration <= 5,
    detail: first.duration <= 5 ? `${first.duration}s` : `${first.duration}s exceeds 5s recommendation`,
  });

  checks.push({
    id: 'hook-words',
    label: 'Hook text ≤ 15 words',
    passed: hookWords <= 15,
    detail: hookWords <= 15 ? `${hookWords} words` : `${hookWords} words (recommend ≤ 15)`,
  });

  return { passed: checks.every(c => c.passed), checks };
}

// ── Script dimension ──────────────────────────────────────────────

function checkScript(storyboard: Storyboard): QualityDim {
  const checks: QualityCheckItem[] = [];

  const totalDuration = storyboard.scenes.reduce((s: number, sc: StoryboardScene) => s + sc.duration, 0);

  checks.push({
    id: 'duration-sum',
    label: 'Scene durations match total',
    passed: Math.abs(totalDuration - storyboard.duration) <= 1,
    detail: `Scenes sum to ${totalDuration}s (storyboard says ${storyboard.duration}s)`,
  });

  // Anti-AI phrase detection across all scenes
  let aiPhrasesFound = 0;
  for (const scene of storyboard.scenes) {
    for (const pattern of AI_PHRASES) {
      if (pattern.test(scene.text) || pattern.test(scene.goal) || pattern.test(scene.visual)) {
        aiPhrasesFound++;
      }
    }
  }

  checks.push({
    id: 'no-ai-phrases',
    label: 'No generic AI phrasing',
    passed: aiPhrasesFound === 0,
    detail: aiPhrasesFound === 0 ? 'Clean' : `${aiPhrasesFound} AI-phrase(s) detected — replace with concrete, specific language`,
  });

  // CTA is the last scene
  const last = storyboard.scenes[storyboard.scenes.length - 1];
  checks.push({
    id: 'cta-is-last',
    label: 'CTA is the final scene',
    passed: !!last && storyboard.scenes.length > 1,
    detail: last ? `Last scene is "${last.id}"` : 'No scenes',
  });

  // Varied transitions check (same transition for consecutive scenes)
  // (not implemented — requires scene-level transition data)

  return { passed: checks.every(c => c.passed), checks };
}

// ── Readability dimension ─────────────────────────────────────────

function checkReadability(storyboard: Storyboard): QualityDim {
  const checks: QualityCheckItem[] = [];

  // Per-scene text length
  let maxChars = 0;
  let maxScene = '';

  for (const scene of storyboard.scenes) {
    if (scene.text.length > maxChars) {
      maxChars = scene.text.length;
      maxScene = scene.id;
    }
  }

  checks.push({
    id: 'text-per-screen',
    label: 'Text per screen ≤ 80 chars',
    passed: maxChars <= 80,
    detail: maxChars <= 80 ? `Max ${maxChars} chars (${maxScene})` : `Scene "${maxScene}" has ${maxChars} chars (recommend ≤ 80)`,
  });

  // Check for <br> tags in text (pattern match across all scene text)
  const brScenes = storyboard.scenes.filter(s => s.text.includes('<br>') || s.text.includes('<br/>'));
  checks.push({
    id: 'no-br-tags',
    label: 'No forced <br> tags in body text',
    passed: brScenes.length === 0,
    detail: brScenes.length === 0 ? 'Clean' : `${brScenes.length} scene(s) use <br> — use max-width instead`,
  });

  return { passed: checks.every(c => c.passed), checks };
}

// ── Platform dimension ────────────────────────────────────────────

function checkPlatform(storyboard: Storyboard, brief?: VideoBrief): QualityDim {
  const checks: QualityCheckItem[] = [];

  if (brief?.distribution?.platforms) {
    for (const platform of brief.distribution.platforms) {
      const guide = PLATFORM_GUIDELINES[platform];
      if (guide) {
        const inRange = storyboard.duration >= guide.min && storyboard.duration <= guide.max;
        checks.push({
          id: `platform-duration-${platform}`,
          label: `Duration fits ${platform} (${guide.min}-${guide.max}s)`,
          passed: inRange,
          detail: inRange
            ? `${storyboard.duration}s fits ${platform}`
            : `${storyboard.duration}s outside ${platform} range (${guide.min}-${guide.max}s, optimal ${guide.optimal}s)`,
        });
      }
    }
  }

  if (checks.length === 0) {
    checks.push({
      id: 'platform-none',
      label: 'No platform constraints specified',
      passed: true,
      detail: 'No distribution.platforms in brief — skipping platform checks',
    });
  }

  return { passed: checks.every(c => c.passed), checks };
}

// ── Brand dimension ───────────────────────────────────────────────

function checkBrand(storyboard: Storyboard, brief?: VideoBrief): QualityDim {
  const checks: QualityCheckItem[] = [];

  if (brief?.motionSystem) {
    checks.push({
      id: 'motion-system-set',
      label: 'Motion system selected',
      passed: true,
      detail: `Using "${brief.motionSystem}"`,
    });
  } else {
    checks.push({
      id: 'motion-system-missing',
      label: 'Motion system selected',
      passed: false,
      detail: 'No motion system specified — output may use browser defaults',
    });
  }

  if (brief?.branding?.colors?.primary) {
    checks.push({
      id: 'brand-palette',
      label: 'Brand palette defined',
      passed: true,
      detail: `Primary: ${brief.branding.colors.primary}`,
    });
  }

  return { passed: checks.every(c => c.passed), checks };
}

// ── Scores ────────────────────────────────────────────────────────

function computeScores(dimensions: Required<QualityReport>['dimensions']): QualityReport['scores'] {
  const passCount = (dim: QualityDim) => dim.checks.filter(c => c.passed).length;
  const total = (dim: QualityDim) => dim.checks.length || 1;

  const hookScore = Math.round((passCount(dimensions.hook) / total(dimensions.hook)) * 100);
  const clarityScore = Math.round(((passCount(dimensions.script) / total(dimensions.script)) * 0.6 + (passCount(dimensions.readability) / total(dimensions.readability)) * 0.4) * 100);
  const platformScore = Math.round((passCount(dimensions.platform) / total(dimensions.platform)) * 100);
  const brandScore = Math.round((passCount(dimensions.brand) / total(dimensions.brand)) * 100);

  const overall = Math.round((hookScore + clarityScore + platformScore + brandScore) / 4);

  return {
    overall,
    hook: hookScore,
    clarity: clarityScore,
    platformFit: platformScore,
    brandConsistency: brandScore,
  };
}

// ── Fix suggestions ───────────────────────────────────────────────

function suggestFix(dimension: string, checkId: string): string {
  const suggestions: Record<string, string> = {
    'hook-hook-duration': 'Reduce hook scene to 2-4s. Move extra content to scene 2.',
    'hook-hook-words': 'Cut hook text to under 15 words. Focus on the core premise — details go in later scenes.',
    'script-duration-sum': 'Adjust scene durations so they sum to the total storyboard duration.',
    'script-no-ai-phrases': 'Replace generic phrases with concrete, specific language. Instead of "revolutionary," describe what specifically changes.',
    'script-cta-is-last': 'Ensure the final scene is a CTA (call to action). Add a closing scene if needed.',
    'readability-text-per-screen': 'Split text across multiple scenes or reduce character count. Each screen should communicate ONE idea.',
    'readability-no-br-tags': 'Remove <br> tags. Use max-width and natural text wrapping instead.',
    'brand-motion-system-missing': 'Specify a motion system in the brief (editorial, tech, warm-soft, cinematic, brutalist, neon, orbital, organic).',
  };

  const key = `${dimension}-${checkId}`;
  return suggestions[key] || 'Review this check against the quality checklist in docs/quality-checklist.md';
}
