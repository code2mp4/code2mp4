/**
 * Curated motion design directions for video.
 *
 * Unlike Open Design's 5 desktop/web directions, these are tuned for
 * video: high-contrast palettes (H.264-safe), display-scale type, and
 * easing signatures matched to energy levels.
 *
 * Each direction is a deterministic package:
 *   - Canvas color (background)
 *   - 2 accents (primary + secondary)
 *   - Display + body font stacks (display-scale for video: 60-130px headlines)
 *   - Easing signature (entrance, exit, emphasis)
 *   - Transition preference
 *   - Reference video mood (what it feels like)
 */

export interface MotionDirection {
  id: string;
  label: string;
  description: string;
  reference: string;
  canvas: string;
  accent: string;
  accent2: string;
  displayFont: string;
  bodyFont: string;
  entranceEase: string;
  exitEase: string;
  emphasisEase: string;
  transition: string;
  textShadow: string;
  energy: string;
}

export const MOTION_DIRECTIONS: MotionDirection[] = [
  {
    id: 'editorial',
    label: 'Editorial Monocle',
    description:
      'Confident, refined, serif-forward. Warm off-white canvas, single rust accent. Slow push-ins, generous breathing room. Think: Sunday magazine cover in motion.',
    reference: 'Sunday editorial spreads, luxury brand hero reels, New Yorker animations',
    canvas: '#F5F0EB',
    accent: '#C44F34',
    accent2: '#2C3A42',
    displayFont: "'Playfair Display', 'Noto Serif SC', Georgia, serif",
    bodyFont: "'Source Serif 4', 'Noto Serif', Georgia, serif",
    entranceEase: 'power2.out',
    exitEase: 'power1.in',
    emphasisEase: 'expo.out',
    transition: 'blur crossfade (0.6s, sine.inOut)',
    textShadow: 'none',
    energy: 'calm—medium',
  },
  {
    id: 'tech',
    label: 'Tech / Terminal',
    description:
      'Dark canvas, neon-signal accents. Monospace display, data-dense typography. Glitch dissolves, grid reveals. Think: developer conference openers, API launch reels.',
    reference: 'GitHub Universe, Stripe Sessions, Vercel Ship, datadog dashboards',
    canvas: '#0D1117',
    accent: '#58A6FF',
    accent2: '#3FB950',
    displayFont: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    bodyFont: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    entranceEase: 'power3.out',
    exitEase: 'power2.in',
    emphasisEase: 'back.out(1.4)',
    transition: 'grid dissolve / glitch (0.25s, power2.inOut)',
    textShadow: '0 0 20px currentColor, 0 0 60px currentColor',
    energy: 'medium—high',
  },
  {
    id: 'warm-soft',
    label: 'Warm & Soft',
    description:
      'Cream canvas, terracotta + sage accents. Generous radii, soft light leaks, spring easings. Think: wellness brand reels, D2C product launches, lifestyle content.',
    reference: 'Headspace animations, Allbirds product reels, Ritual brand videos',
    canvas: '#FAF7F2',
    accent: '#D97757',
    accent2: '#6B8F71',
    displayFont: "'Quicksand', 'Nunito', 'SF Pro Rounded', sans-serif",
    bodyFont: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    entranceEase: 'back.out(1.2)',
    exitEase: 'power2.in',
    emphasisEase: 'elastic.out(1, 0.4)',
    transition: 'light leak / soft wipe (0.5s, power2.out)',
    textShadow: '0 2px 8px rgba(0,0,0,0.06)',
    energy: 'calm—medium',
  },
  {
    id: 'cinematic',
    label: 'Cinematic / Dramatic',
    description:
      'Near-black canvas, warm gold + cool blue accents. Slow atmospheric builds, lens flares, heavy typography. Think: movie title sequences, high-stakes product reveals.',
    reference: 'Apple keynote openers, movie title sequences, luxury automotive reels',
    canvas: '#0A0A0A',
    accent: '#D4A853',
    accent2: '#4A90D9',
    displayFont: "'Cormorant Garamond', 'Noto Serif SC', 'Bodoni Moda', serif",
    bodyFont: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    entranceEase: 'power4.out',
    exitEase: 'power3.in',
    emphasisEase: 'expo.out',
    transition: 'zoom through / gravitational lens (0.4s, power3.inOut)',
    textShadow: '0 0 40px rgba(212,168,83,0.3)',
    energy: 'dramatic',
  },
  {
    id: 'brutalist',
    label: 'Brutalist / Experimental',
    description:
      'Raw newsprint canvas, hazard red + phosphor white. Oversized grotesque, no shadows, hard cuts. Think: art-film openers, experimental fashion reels, underground music visuals.',
    reference: 'CRT terminal aesthetics, rave flyers, industrial design manuals, Balenciaga campaigns',
    canvas: '#EBE5D9',
    accent: '#E53935',
    accent2: '#1A1A1A',
    displayFont: "'Helvetica Now', 'Inter Tight', 'Impact', sans-serif",
    bodyFont: "'JetBrains Mono', 'Fira Code', monospace",
    entranceEase: 'power3.in',
    exitEase: 'none',
    emphasisEase: 'power4.in',
    transition: 'hard cut / whip pan (0.15s, none)',
    textShadow: 'none',
    energy: 'high / aggressive',
  },
];

export function renderMotionDirectionFormBody(): string {
  const cards = MOTION_DIRECTIONS.map((d) => ({
    id: d.id,
    title: d.label,
    description: d.description,
    reference: d.reference,
    swatch: d.accent,
    swatch2: d.accent2,
    canvas: d.canvas,
    font: d.displayFont,
    energy: d.energy,
  }));
  return JSON.stringify(
    {
      questions: [
        {
          id: 'motion_direction',
          label: 'Choose a motion direction',
          type: 'direction-cards',
          required: true,
          cards,
        },
        {
          id: 'accent_override',
          label: 'Custom accent color?',
          type: 'text',
          placeholder: 'e.g. #FF6B35 or "keep defaults"',
        },
      ],
    },
    null,
    2,
  );
}

export function renderMotionDirectionSpecBlock(): string {
  const blocks = MOTION_DIRECTIONS.map(
    (d) =>
      `### ${d.label} (\`${d.id}\`)\n` +
      `- **Reference:** ${d.reference}\n` +
      `- **Canvas:** \`${d.canvas}\`\n` +
      `- **Accent:** \`${d.accent}\`\n` +
      `- **Accent 2:** \`${d.accent2}\`\n` +
      `- **Display:** ${d.displayFont}\n` +
      `- **Body:** ${d.bodyFont}\n` +
      `- **Entrance ease:** \`${d.entranceEase}\`\n` +
      `- **Exit ease:** \`${d.exitEase}\`\n` +
      `- **Emphasis ease:** \`${d.emphasisEase}\`\n` +
      `- **Transition:** ${d.transition}\n` +
      `- **Energy:** ${d.energy}\n`,
  );
  return (
    '## Motion direction library\n\n' +
    'These 5 curated directions are the only supported visual starting points. ' +
    'Each is a deterministic package: palette, fonts, easing signatures, ' +
    'transition preference, and energy level. When the user picks one, bind ' +
    'its tokens verbatim into the composition. Do not improvise.\n\n' +
    blocks.join('\n')
  );
}
