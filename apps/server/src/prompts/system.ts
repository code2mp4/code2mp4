/**
 * Video system prompt composer.
 *
 * Stacks 6 layers (simplified from Open Design's 8 layers):
 *
 *   1. VIDEO_DISCOVERY (discovery + philosophy) — hard rules for turn 1-3
 *   2. OFFICIAL_VIDEO_PRODUCER_PROMPT (identity charter)
 *   3. Active MOTION.md (motion design system) — palette, easing, transition rules
 *   4. Active SKILL.md (video skill) — workflow specific to video type
 *   5. Project metadata — pre-selected options from project creation
 *   6. HYPERFRAMES_CONTRACT — load-bearing composition rules (pinned LAST)
 *
 * The composed string is the agent's system prompt.
 */
import { OFFICIAL_VIDEO_PRODUCER_PROMPT } from './video-identity.js';
import { VIDEO_DISCOVERY } from './video-discovery.js';
import { HYPERFRAMES_CONTRACT } from './video-contract.js';

export const BASE_VIDEO_SYSTEM_PROMPT = OFFICIAL_VIDEO_PRODUCER_PROMPT;

export interface VideoComposeInput {
  skillBody?: string;
  skillName?: string;
  motionSystemBody?: string;
  motionSystemTitle?: string;
  scriptSystemBody?: string;
  scriptSystemTitle?: string;
  metadata?: VideoProjectMetadata;
}

export interface VideoProjectMetadata {
  kind?: string;
  videoType?: string;
  duration?: number | null;
  orientation?: string | null;
  energy?: string | null;
  audioNeeds?: string[] | null;
  copy?: string | null;
  motionSystemId?: string | null;
  voiceModel?: string | null;
  voiceId?: string | null;
}

export function composeVideoSystemPrompt({
  skillBody, skillName,
  motionSystemBody, motionSystemTitle,
  scriptSystemBody, scriptSystemTitle,
  metadata,
}: VideoComposeInput): string {
  const parts: string[] = [
    // Layer 1: Discovery + philosophy must win on turn ordering
    VIDEO_DISCOVERY,
    '\n\n---\n\n# Identity and workflow charter\n\n',
    BASE_VIDEO_SYSTEM_PROMPT,
  ];

  // Layer 2: Motion design system (analogous to DESIGN.md)
  if (motionSystemBody && motionSystemBody.trim().length > 0) {
    // Extract compact tokens: palette + fonts + easing (first 800 chars of body is usually enough)
    // or use the first 4 key sections
    const tokens = extractMotionTokens(motionSystemBody, motionSystemTitle);
    parts.push(
      `\n\n## Active motion system${motionSystemTitle ? ` — ${motionSystemTitle}` : ''}\n\nBind these tokens into the composition:\n\n${tokens}\n\nFull MOTION.md available at: motion-systems/${motionSystemTitle || 'tech'}/MOTION.md — Read it for detailed rules.`,
    );
  } else {
    parts.push(
      '\n\n## No motion system selected — choose a style\n\nIf no motion system is active, you MUST pick a deliberate visual identity from the 5 curated motion directions (editorial, tech, warm-soft, cinematic, brutalist) or from the HyperFrames visual-styles.md presets. Never use browser defaults (#333, #3b82f6, Roboto). Always define a palette, font stack, and easing signature before writing composition HTML.',
    );
  }

  // Layer 2.5: Script system (narrative constraints — compact summary)
  if (scriptSystemBody && scriptSystemBody.trim().length > 0) {
    parts.push(
      `\n\n## Active script system${scriptSystemTitle ? ` — ${scriptSystemTitle}` : ''}\n\nNarrative structure:\n${scriptSystemBody.trim()}\n\nFull SCRIPT.md at: script-systems/${scriptSystemTitle || 'tech-demo'}/SCRIPT.md`,
    );
  }

  // Layer 3: Skill (video-specific workflow — compact reference)
  if (skillBody && skillBody.trim().length > 0) {
    parts.push(
      `\n\n## Active skill${skillName ? ` — ${skillName}` : ''}\n\nScene count, animation patterns, and checklist are in the full SKILL.md at video-skills/${skillName || 'product-launch'}/SKILL.md — Read it before building. Key pointers:${extractSkillHints(skillBody)}`,
    );
  }

  // Layer 4: Project metadata
  const metaBlock = renderVideoMetadataBlock(metadata);
  if (metaBlock) parts.push(metaBlock);

  // Layer 5: HyperFrames contract ALWAYS pinned last (it's the load-bearing
  //        composition rules that must beat any softer wording above)
  parts.push(`\n\n${HYPERFRAMES_CONTRACT}`);

  return parts.join('');
}

function renderVideoMetadataBlock(
  metadata: VideoProjectMetadata | undefined,
): string {
  if (!metadata) return '';
  const lines: string[] = [];
  lines.push('\n\n## Project metadata');
  lines.push(
    'These are the structured choices the user made when creating this video project. Treat known fields as authoritative; for any field marked "(unknown)" you MUST include a matching question in your turn-1 discovery form.',
  );
  lines.push('');
  lines.push(`- **kind**: ${metadata.kind ?? 'video'}`);

  if (metadata.videoType) {
    lines.push(`- **videoType**: ${metadata.videoType}`);
  } else {
    lines.push('- **videoType**: (unknown — ask in discovery)');
  }

  if (typeof metadata.duration === 'number') {
    lines.push(`- **durationSeconds**: ${metadata.duration}`);
  } else {
    lines.push('- **durationSeconds**: (unknown — ask in discovery)');
  }

  if (metadata.orientation) {
    lines.push(`- **orientation**: ${metadata.orientation}`);
    const res =
      metadata.orientation === '9:16'
        ? 'portrait'
        : metadata.orientation === '1:1'
          ? 'square'
          : 'landscape';
    lines.push(`- **resolution** (data-resolution attr): \`${res}\``);
  }

  if (metadata.energy) {
    lines.push(`- **energy**: ${metadata.energy}`);
  }

  if (metadata.audioNeeds && metadata.audioNeeds.length > 0) {
    lines.push(`- **audioNeeds**: ${metadata.audioNeeds.join(', ')}`);
  }

  if (metadata.motionSystemId) {
    lines.push(
      `- **motionSystemId**: \`${metadata.motionSystemId}\` — look this up in the Motion direction library`,
    );
  }

  if (metadata.copy) {
    const truncated =
      metadata.copy.length > 2000
        ? metadata.copy.slice(0, 2000) +
          `\n… (truncated ${metadata.copy.length - 2000} chars)`
        : metadata.copy;
    lines.push('');
    lines.push('### User-provided copy / script');
    lines.push('```text');
    lines.push(truncated);
    lines.push('```');
    lines.push(
      'Use this copy verbatim in the composition. Only edit for length/fit — do not rewrite the message.',
    );
  }

  lines.push('');
  lines.push(
    'This is a **HyperFrames video** project. The output artifact is an MP4 file, not HTML. Author the composition HTML following the HyperFrames contract at the bottom of this prompt, then render to MP4.',
  );

  return lines.join('\n');
}

function deriveVideoPreflight(skillBody: string): string {
  const refs: string[] = [];
  if (/assets\/template\.html/.test(skillBody))
    refs.push('`assets/template.html`');
  if (/references\/storyboard\.md/.test(skillBody))
    refs.push('`references/storyboard.md`');
  if (/references\/checklist\.md/.test(skillBody))
    refs.push('`references/checklist.md`');
  if (/references\/timing\.md/.test(skillBody))
    refs.push('`references/timing.md`');
  if (refs.length === 0) return '';
  return ` **Pre-flight (do this before any other tool):** Read ${refs.join(', ')}. The template defines the composition skeleton; the storyboard is the only acceptable scene structure; the checklist is your pre-render gate.`;
}

function extractMotionTokens(body: string, title?: string): string {
  const lines: string[] = [];
  // Extract palette (Canvas + Accent + Accent 2)
  const canvas = body.match(/\*\*Canvas.*?:\*\*\s*`(#[0-9a-fA-F]{6})`/);
  const accent = body.match(/\*\*Primary accent.*?:\*\*\s*`(#[0-9a-fA-F]{6})`/);
  const accent2 = body.match(/\*\*Secondary accent.*?:\*\*\s*`(#[0-9a-fA-F]{6})`/);
  const display = body.match(/\*\*Display font:\*\*\s*(.+?)(?:\n|$)/);
  const bodyFont = body.match(/\*\*Body font:\*\*\s*(.+?)(?:\n|$)/);
  const entrance = body.match(/Entrance.*?:\s*`([^`]+)`/);
  const exit = body.match(/Exit.*?:\s*`([^`]+)`/);
  const transition = body.match(/Default.*?:\s*(.+?)(?:\n|$)/);
  const headlineSize = body.match(/headlines[,:]\s*(\d+)[–-](\d+)px/);

  if (canvas) lines.push(`Canvas: ${canvas[1]}`);
  if (accent) lines.push(`Accent: ${accent[1]}`);
  if (accent2) lines.push(`Accent 2: ${accent2[1]}`);
  if (display) lines.push(`Display font: ${display[1].trim()}`);
  if (bodyFont) lines.push(`Body font: ${bodyFont[1].trim()}`);
  if (entrance) lines.push(`Entrance ease: ${entrance[1]}`);
  if (exit) lines.push(`Exit ease: ${exit[1]}`);
  if (transition) lines.push(`Transition: ${transition[1].trim()}`);
  if (headlineSize) lines.push(`Headline size: ${headlineSize[1]}-${headlineSize[2]}px`);

  return lines.length > 0 ? lines.join('\n') : `Use the "${title || 'motion system'}" palette from MOTION.md`;
}

function extractSkillHints(body: string): string {
  const lines: string[] = [];
  const sceneCount = body.match(/(\d)[–-](\d)\s*scenes/i);
  const patterns = body.match(/Pattern\s+[A-D][.:]\s*(.+?)(?:\n|$)/gi);
  if (sceneCount) lines.push(`  ${sceneCount[1]}-${sceneCount[2]} scenes`);
  if (patterns) {
    const names = patterns.map(p => p.replace(/Pattern\s+[A-D][.:]\s*/, '').trim()).slice(0, 3);
    lines.push(`  Patterns: ${names.join(', ')}`);
  }
  return lines.length > 0 ? '\n' + lines.join('\n') : '';
}
