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
  skillBody,
  skillName,
  motionSystemBody,
  motionSystemTitle,
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
    parts.push(
      `\n\n## Active motion design system${motionSystemTitle ? ` — ${motionSystemTitle}` : ''}\n\nTreat the following MOTION.md as authoritative for palette, typography, easing signatures, transition preferences, and timing rules. Bind these tokens into the composition's \`:root\` or \`<style>\` block before generating any layout. Do not invent colors, fonts, or easing curves outside this palette.\n\n${motionSystemBody.trim()}`,
    );
  }

  // Layer 3: Skill (video-specific workflow)
  if (skillBody && skillBody.trim().length > 0) {
    const preflight = deriveVideoPreflight(skillBody);
    parts.push(
      `\n\n## Active skill${skillName ? ` — ${skillName}` : ''}\n\nFollow this skill's workflow exactly.${preflight}\n\n${skillBody.trim()}`,
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
