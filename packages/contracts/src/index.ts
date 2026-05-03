/**
 * Open Video shared contracts.
 *
 * Types shared between web and server. Keep this package pure TypeScript —
 * no Next.js, Express, Node filesystem, browser APIs, or sidecar deps.
 */

// ── Motion systems ──────────────────────────────────────────────────
export interface MotionSystemSummary {
  id: string;
  title: string;
  category: string;
  summary: string;
  energy: string;
  swatches: string[];
}

// ── Video project ───────────────────────────────────────────────────
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
  voiceModel?: string;
  voiceId?: string;
}

// ── Render events (SSE) ────────────────────────────────────────────
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

// ── HyperFrames operations ──────────────────────────────────────────
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

// ── Skill summary ──────────────────────────────────────────────────
export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  mode: string;
  surface: string;
  scenario: string;
}

// ── Motion direction (for direction-cards form) ────────────────────
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
