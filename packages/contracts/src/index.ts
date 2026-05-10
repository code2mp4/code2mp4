/**
 * Code2MP4 shared contracts.
 *
 * Types shared between web and server. Keep this package pure TypeScript —
 * no Next.js, Express, Node filesystem, browser APIs, or sidecar deps.
 *
 * These types enforce the production schema layer defined in docs/:
 *   brief.json → script.json → storyboard.json → scene.json
 *   → render.config.json → quality-report.json
 */

// ═══════════════════════════════════════════════════════════════════
// Video production schemas — the workflow layer
// ═══════════════════════════════════════════════════════════════════

/** Video Brief — upstream input. WHY the video exists. */
export interface VideoBrief {
  id: string;
  goal: {
    primary: string;
    secondary: string;
  };
  audience: {
    who: string;
    context: string;
    pain?: string;
    awareness: 'unaware' | 'problem-aware' | 'solution-aware' | 'product-aware';
  };
  format: {
    primary: '16:9' | '9:16' | '1:1' | '4:5';
    variants?: ('16:9' | '9:16' | '1:1' | '4:5')[];
    duration: number;
    durationVariants?: number[];
  };
  tone?: 'professional' | 'friendly' | 'technical' | 'dramatic' | 'minimal' | 'playful';
  energy?: 'calm' | 'medium' | 'high' | 'dramatic';
  motionSystem?: 'editorial' | 'tech' | 'warm-soft' | 'cinematic' | 'brutalist';
  branding?: {
    logo?: string;
    colors?: { primary?: string; secondary?: string };
    font?: string;
  };
  audio?: {
    voiceover?: boolean;
    backgroundMusic?: boolean;
    sfx?: boolean;
    voiceModel?: string;
    musicTrack?: string;
  };
  constraints?: {
    noAudio?: boolean;
    safeZone?: number;
    maxTextPerScreen?: number;
    includeCaptions?: boolean;
    deadline?: string;
  };
  distribution?: {
    platforms?: string[];
    needsCover?: boolean;
    needsSocialCopy?: boolean;
  };
}

/** Script — WHAT the video communicates. */
export interface VideoScript {
  briefId: string;
  hook: {
    line: string;
    type: 'question' | 'statement' | 'stat' | 'contrast' | 'pattern-interrupt';
    duration: number;
  };
  narrativeArc:
    | 'problem-solution-cta'
    | 'what-why-how-get-started'
    | 'hook-context-features-proof-cta'
    | 'teaser-reveal-details-cta'
    | 'before-after-cta';
  segments: ScriptSegment[];
  pacing?: {
    pattern: 'fast-fast-slow' | 'slow-build' | 'steady' | 'peak-valley' | 'accelerating';
    beatsPerSegment?: number;
    pauses?: { after: string; duration: number }[];
  };
  cta: {
    text: string;
    style: 'direct' | 'soft' | 'curiosity' | 'urgency' | 'social-proof';
    visual?: string;
    duration: number;
  };
  voiceover?: {
    fullText: string;
    wordCount: number;
    estimatedDuration: number;
    voiceModel?: string;
  };
  closedCaptions?: boolean;
}

export interface ScriptSegment {
  id: string;
  type: 'hook' | 'context' | 'problem' | 'promise' | 'feature' | 'proof' | 'detail' | 'cta' | 'outro';
  duration: number;
  text: string;
  voiceover?: string;
  transition?: 'crossfade' | 'wipe' | 'hard-cut' | 'shader';
  emphasis?: 'none' | 'bold-word' | 'highlight-phrase' | 'counter' | 'stat-callout';
}

/** Storyboard — HOW each scene looks and moves. */
export interface Storyboard {
  title: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  motionSystem?: 'editorial' | 'tech' | 'warm-soft' | 'cinematic' | 'brutalist';
  scenes: StoryboardScene[];
}

export interface StoryboardScene {
  id: string;
  duration: number;
  goal: string;
  visual: string;
  text: string;
  motion: string;
  audio?: string | null;
}

/** Scene spec — per-scene agent-executable specification. */
export interface SceneSpec {
  id: string;
  duration: number;
  briefId?: string;
  scriptId?: string;
  layout: {
    type:
      | 'center-text' | 'split-horizontal' | 'split-vertical'
      | 'card-grid-2' | 'card-grid-3' | 'card-grid-4'
      | 'full-bleed-image' | 'terminal-window'
      | 'bullet-list' | 'comparison-table'
      | 'icon-row' | 'single-button';
    background?: string;
    padding?: number;
    gap?: number;
  };
  elements: SceneElement[];
  motion: SceneMotion;
  in?: { type: string; duration: number; ease?: string };
  out?: { type: string; duration: number; ease?: string };
  audio?: {
    voiceover?: string;
    sfx?: string;
    music?: string;
  };
}

export interface SceneElement {
  id: string;
  type: 'headline' | 'subhead' | 'body' | 'card' | 'button' | 'icon' | 'image' | 'counter' | 'code-block' | 'divider' | 'logo' | 'badge';
  position: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom'; order?: number };
  style: {
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    maxWidth?: number;
    textAlign?: 'left' | 'center' | 'right';
  };
  content?: {
    text?: string;
    icon?: string;
    src?: string;
  };
}

export interface SceneMotion {
  entrance?: {
    element: string;
    from: Record<string, unknown>;
    to?: Record<string, unknown>;
    duration: number;
    delay?: number;
    ease?: string;
  };
  emphasis?: {
    type: 'pulse' | 'glow' | 'bounce' | 'shake' | 'counter-roll' | 'underline-sweep' | 'typewriter' | 'highlight-reveal' | 'none';
    target: string;
    startTime: number;
    duration: number;
  };
  exit?: {
    description?: string;
    element?: string;
    to?: Record<string, unknown>;
    duration?: number;
    ease?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// Quality system
// ═══════════════════════════════════════════════════════════════════

export interface QualityReport {
  videoId: string;
  passed: boolean;
  dimensions: {
    hook: QualityDimension;
    script: QualityDimension;
    readability: QualityDimension;
    motion: QualityDimension;
    platform: QualityDimension;
    brand?: QualityDimension;
    render?: QualityDimension;
  };
  errors: QualityFinding[];
  warnings: QualityFinding[];
  scores: {
    overall: number;
    hook?: number;
    engagement?: number;
    clarity?: number;
    platformFit?: number;
    brandConsistency?: number;
  };
}

export interface QualityDimension {
  passed: boolean;
  checks: QualityCheck[];
}

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface QualityFinding {
  check: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
}

// ═══════════════════════════════════════════════════════════════════
// Campaign
// ═══════════════════════════════════════════════════════════════════

export interface CampaignManifest {
  campaign: {
    id: string;
    title: string;
    briefId: string;
    variants: CampaignVariant[];
    covers: CampaignCover[];
    copy: CampaignCopy[];
  };
}

export interface CampaignVariant {
  id: string;
  aspect: '16:9' | '9:16' | '1:1' | '4:5';
  duration: number;
  file: string;
  platforms: string[];
  captions?: string;
}

export interface CampaignCover {
  platform: string;
  file: string;
  aspect: string;
}

export interface CampaignCopy {
  platform: string;
  file: string;
}

// ═══════════════════════════════════════════════════════════════════
// Render configuration
// ═══════════════════════════════════════════════════════════════════

export interface RenderConfig {
  compositionDir: string;
  output: string;
  engine?: 'hyperframes' | 'remotion';
  quality?: 'draft' | 'standard' | 'high';
  fps?: number;
  resolution?: 'hd' | 'fhd' | '4k';
  format?: 'mp4' | 'webm';
  codec?: 'h264' | 'h265' | 'vp9';
  audio?: {
    codec?: 'aac' | 'opus';
    bitrate?: string;
    sampleRate?: number;
  };
  variables?: Record<string, string>;
  variant?: { name: string; parent?: string };
  preCheck?: {
    lint?: boolean;
    validate?: boolean;
    inspect?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════
// Pipeline (existing — kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════

export interface PipelineJob {
  id: string;
  projectId: string;
  brief: string;
  briefJson?: VideoBrief;
  status: 'scripting' | 'rendering_scenes' | 'assembling' | 'done' | 'failed';
  script?: Storyboard;
  scenes: PipelineSceneFragment[];
  outputMp4?: string;
  error?: string;
  sceneRunIds?: string[];
}

export interface PipelineSceneFragment {
  number: number;
  html: string;
  duration: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════
// Legacy types (preserved for existing consumers)
// ═══════════════════════════════════════════════════════════════════

export interface MotionSystemSummary {
  id: string;
  title: string;
  category: string;
  summary: string;
  energy: string;
  swatches: string[];
}

export interface VideoProject {
  id: string;
  name: string;
  config: VideoProjectConfig;
  createdAt: string;
}

export interface VideoProjectConfig {
  videoType?: string;
  duration?: number;
  orientation?: '16:9' | '9:16' | '1:1';
  energy?: string;
  audioNeeds?: string[];
  copy?: string;
  motionSystemId?: string;
  musicId?: string | null;
  voiceModel?: string;
  voiceId?: string;
}

export interface RenderProgressEvent {
  type: 'progress';
  frame: number;
  totalFrames: number;
  compositionDir?: string;
}

export interface RenderCompleteEvent {
  type: 'complete';
  outputPath: string;
  fileSize: number;
}

export interface RenderErrorEvent {
  type: 'error';
  message: string;
}

export type RenderEvent = RenderProgressEvent | RenderCompleteEvent | RenderErrorEvent;

export interface LintResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface SystemRequirements {
  node: boolean;
  ffmpeg: boolean;
  hyperframes: boolean;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  mode: string;
  surface: string;
  scenario: string;
}

export interface MotionDirectionCard {
  id: string;
  title: string;
  description: string;
  reference: string;
  swatch: string;
  swatch2: string;
  canvas: string;
  font: string;
  energy: string;
}

// ═══════════════════════════════════════════════════════════════════
// Template manifest
// ═══════════════════════════════════════════════════════════════════

export interface TemplateManifest {
  id: string;
  type: 'product-launch' | 'oss-intro' | 'release-notes' | 'tutorial-video' | 'social-short' | 'custom';
  version: string;
  label: string;
  description: string;
  storyboard: {
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
    duration: number;
    minScenes: number;
    maxScenes: number;
    archetype: string;
  };
  motionSystem: 'editorial' | 'tech' | 'warm-soft' | 'cinematic' | 'brutalist';
  motionSystemAlternatives?: string[];
  skills?: string[];
  scriptSystem?: string;
  questions?: TemplateQuestion[];
  tags?: string[];
}

export interface TemplateQuestion {
  id: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'toggle';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: unknown;
}
