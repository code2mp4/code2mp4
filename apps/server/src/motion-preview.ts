/**
 * Motion system preview generator.
 * Generates a sample HyperFrames HTML composition for each motion system
 * so users can preview the look-and-feel before choosing.
 */
import type { MotionSystemSummary } from './motion-systems.js';
import { readMotionSystem } from './motion-systems.js';

export function generateMotionPreviewHtml(system: MotionSystemSummary): string {
  // Extract key design tokens from the body
  const body = system.body ?? '';
  const canvas = extractToken(body, 'Canvas', '#0D1117');
  const accent = extractToken(body, 'Primary accent', '#58A6FF');
  const displayFont = extractFontFamily(body);
  const entranceEase = extractEasing(body, 'Entrance', 'power3.out');

  return `<!DOCTYPE html>
<html data-composition-id="motion-preview-${system.id}" data-composition-duration="5" data-resolution="landscape">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  :root { --bg: ${canvas}; --accent: ${accent}; --fg: ${isDark(canvas) ? '#E6EDF3' : '#1A1A1A'}; --muted: ${isDark(canvas) ? '#8B949E' : '#888888'}; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background: var(--bg); font-family: ${displayFont}; overflow:hidden; width:1920px; height:1080px; }
  #stage { position:relative; width:1920px; height:1080px; }
  #stage-zoom-container { width:100%; height:100%; }
  .scene { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; opacity:0; }
  .scene:first-child { opacity:1; }
  .scene-content { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:160px; gap:20px; box-sizing:border-box; }
  .title { font-size:100px; font-weight:700; color:var(--fg); text-align:center; text-shadow: 0 0 30px ${accent}40; }
  .subtitle { font-size:36px; color:var(--muted); text-align:center; }
  .accent-line { width:80px; height:3px; background:var(--accent); border-radius:2px; }
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
<div id="stage" data-composition-id="motion-preview-${system.id}" data-start="0" data-duration="5" data-width="1920" data-height="1080">
<div id="stage-zoom-container">
  <div class="scene" data-scene="1" style="opacity:1">
    <div class="scene-content">
      <div class="accent-line" id="line"></div>
      <div class="title" id="title">${escapeHtml(system.title)}</div>
      <div class="subtitle" id="sub">${escapeHtml(system.energy ?? 'medium')} · ${escapeHtml(system.category ?? 'General')}</div>
    </div>
  </div>
</div>
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  tl.from("#line", { scaleX: 0, duration: 0.5, ease: "power2.out" }, 0.2);
  tl.from("#title", { y: 50, opacity: 0, duration: 0.7, ease: "${entranceEase}" }, 0.5);
  tl.from("#sub", { y: 20, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.9);
  window.__timelines["motion-preview-${system.id}"] = tl;
</script>
</body></html>`;
}

// ── Token extraction helpers ─────────────────────────────────────────

function extractToken(body: string, label: string, fallback: string): string {
  // Look for patterns like "**Canvas (background):** \`#0D1117\`"
  const re = new RegExp(`${escapeRegex(label)}[^]*?\`(#[0-9a-fA-F]{6})\``, 'i');
  const m = body.match(re);
  return m?.[1]?.toLowerCase() ?? fallback;
}

function extractFontFamily(body: string): string {
  // Look for "**Display font:** Playfair Display, ..."
  const m = body.match(/\*\*Display font:\*\*\s*(.+?)(?:\n|$)/i);
  if (m) return m[1].trim();
  return "'Inter', system-ui, sans-serif";
}

function extractEasing(body: string, label: string, fallback: string): string {
  const re = new RegExp(`${escapeRegex(label)}[^]*?\`([a-z]+\\d*\\.(?:in|out|inOut)(?:\\([^)]*\\))?)\``, 'i');
  const m = body.match(re);
  return m?.[1] ?? fallback;
}

function isDark(hex: string): boolean {
  if (!/^#[0-9a-f]{6}$/.test(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
