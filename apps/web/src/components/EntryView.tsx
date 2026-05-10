import { useEffect, useMemo, useState } from 'react';
import type { VideoProjectConfig } from '@code2mp4/contracts';
import { AgentPicker } from './AgentPicker';

interface ProjectItem {
  id: string;
  name: string;
  config?: Record<string, unknown>;
}

interface Props {
  projects: ProjectItem[];
  onCreateProject: (name: string, config: VideoProjectConfig, initialPrompt?: string) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

type LibraryTab = 'all' | 'drafts' | 'rendered' | 'templates';
type ViewMode = 'grid' | 'list';

const VIDEO_TYPES = [
  { id: 'product-launch', label: 'Product launch', desc: 'Problem, promise, proof, CTA' },
  { id: 'social-short', label: 'Social short', desc: 'Fast vertical reel with kinetic captions' },
  { id: 'tutorial', label: 'Tutorial', desc: 'Step-by-step explainer with clear scenes' },
  { id: 'brand-intro', label: 'Brand intro', desc: 'Logo reveal and motion identity opener' },
  { id: 'caption-reel', label: 'Caption reel', desc: 'Text-first rhythm synced to audio' },
] as const;

const TEMPLATES = [
  {
    label: 'Launch teaser',
    type: 'product-launch',
    duration: 15,
    orientation: '16:9',
    prompt: '15-second product launch teaser. Dark studio canvas, product hero reveal, three crisp feature callouts, confident CTA.',
  },
  {
    label: 'Founder reel',
    type: 'social-short',
    duration: 10,
    orientation: '9:16',
    prompt: '10-second vertical founder reel. Hook in the first second, bold kinetic captions, quick proof point, follow CTA.',
  },
  {
    label: 'Release notes',
    type: 'custom',
    duration: 25,
    orientation: '16:9',
    prompt: '25-second release notes video. Version title, three shipped improvements, one visual proof moment, upgrade CTA.',
  },
  {
    label: 'Logo sting',
    type: 'brand-intro',
    duration: 5,
    orientation: '16:9',
    prompt: '5-second logo sting on a black video canvas. Signal-blue accent, precise grid reveal, short final hold.',
  },
] as const;

export function EntryView({
  projects, onCreateProject, onOpenProject, onDeleteProject,
  selectedAgentId, onSelectAgent,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [system, setSystem] = useState<{ node?: boolean; ffmpeg?: boolean; hyperframes?: boolean }>({});
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [videoType, setVideoType] = useState<string>('product-launch');
  const [orientation, setOrientation] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<number>(15);
  const [motionSystem, setMotionSystem] = useState('tech');
  const [energy, setEnergy] = useState('medium');

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        setAgentCount(d.detectedAgents ?? 0);
        setSystem(d.system ?? {});
        setHealthError(null);
      })
      .catch(() => setHealthError('Server offline'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (libraryTab === 'templates') return false;
      if (libraryTab === 'rendered') return false;
      if (!q) return true;
      const haystack = [
        p.name,
        p.config?.videoType,
        p.config?.orientation,
        p.config?.motionSystemId,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, search, libraryTab]);

  const createVideo = (override?: typeof TEMPLATES[number]) => {
    const sourcePrompt = override?.prompt ?? prompt.trim();
    if (!sourcePrompt) return;
    const type = override?.type ?? videoType;
    const aspect = (override?.orientation ?? orientation) as VideoProjectConfig['orientation'];
    const length = override?.duration ?? duration;
    const name = (override?.label || projectName.trim() || sourcePrompt.slice(0, 56)).replace(/\s+/g, ' ').trim();
    onCreateProject(name || 'Untitled video', {
      videoType: type,
      orientation: aspect,
      duration: length,
      energy,
      motionSystemId: motionSystem,
      copy: sourcePrompt,
    }, sourcePrompt);
  };

  return (
    <div style={S.shell} role="application" aria-label="Code2MP4 Studio">
      <aside style={S.leftRail}>
        <div style={S.brandRow}>
          <div style={S.logoMark}>C2</div>
          <div>
            <div style={S.brandTitle}>Code2MP4</div>
            <div style={S.brandSub}>Storyboard → source → MP4</div>
          </div>
        </div>

        <div style={S.agentBlock}>
          <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
          <div style={S.agentHint}>
            {loading ? 'Checking runtime...' : healthError ? healthError : `${agentCount} agents · HyperFrames ${system.hyperframes ? 'ready' : 'missing'}`}
          </div>
        </div>

        <section style={S.createPanel}>
          <div style={S.sectionKicker}>New production</div>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="Project name"
            style={S.input}
          />
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the video: audience, message, product, scenes, CTA..."
            rows={6}
            style={S.briefInput}
          />

          <div style={S.fieldGrid}>
            <label style={S.fieldLabel}>
              Type
              <select value={videoType} onChange={e => setVideoType(e.target.value)} style={S.select}>
                {VIDEO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                <option value="custom">Custom</option>
              </select>
            </label>
            <label style={S.fieldLabel}>
              Ratio
              <select value={orientation} onChange={e => setOrientation(e.target.value as '16:9' | '9:16' | '1:1')} style={S.select}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <label style={S.fieldLabel}>
              Duration
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={S.select}>
                {[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v}s</option>)}
              </select>
            </label>
            <label style={S.fieldLabel}>
              Motion
              <select value={motionSystem} onChange={e => setMotionSystem(e.target.value)} style={S.select}>
                {['tech', 'editorial', 'warm-soft', 'cinematic', 'brutalist', 'neon', 'orbital', 'organic'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={S.segmented}>
            {['calm', 'medium', 'high', 'dramatic'].map(v => (
              <button key={v} onClick={() => setEnergy(v)} style={{ ...S.segmentBtn, ...(energy === v ? S.segmentBtnActive : {}) }}>
                {v}
              </button>
            ))}
          </div>

          <button onClick={() => createVideo()} disabled={!prompt.trim()} style={{ ...S.primaryBtn, opacity: prompt.trim() ? 1 : 0.45 }}>
            Start production
          </button>
        </section>

        <section style={S.templateStack}>
          <div style={S.sectionKicker}>Production templates</div>
          {TEMPLATES.map(t => (
            <button key={t.label} style={S.templateBtn} onClick={() => createVideo(t)}>
              <span style={S.templateTitle}>{t.label}</span>
              <span style={S.templateMeta}>{t.type} · {t.duration}s · {t.orientation}</span>
            </button>
          ))}
        </section>
      </aside>

      <main style={S.main}>
        <header style={S.topBar}>
          <nav style={S.topTabs} aria-label="Studio sections">
            {(['all', 'drafts', 'rendered', 'templates'] as LibraryTab[]).map(tab => (
              <button key={tab} onClick={() => setLibraryTab(tab)} style={{ ...S.topTab, ...(libraryTab === tab ? S.topTabActive : {}) }}>
                {tab === 'all' ? 'Videos' : tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos, formats, motion systems..." style={S.searchInput} />
          </div>
          <div style={S.viewToggle}>
            <button onClick={() => setViewMode('grid')} style={{ ...S.iconBtn, ...(viewMode === 'grid' ? S.iconBtnActive : {}) }}>Grid</button>
            <button onClick={() => setViewMode('list')} style={{ ...S.iconBtn, ...(viewMode === 'list' ? S.iconBtnActive : {}) }}>List</button>
          </div>
        </header>

        <section style={S.heroBand}>
          <div>
            <div style={S.heroKicker}>Agent-native video pipeline</div>
            <h1 style={S.heroTitle}>Build editable motion source and deterministic MP4 output.</h1>
          </div>
          <div style={S.metrics}>
            <Metric label="Projects" value={String(projects.length)} />
            <Metric label="Agents" value={String(agentCount)} />
            <Metric label="Runtime" value={system.hyperframes ? 'Ready' : 'Check'} />
          </div>
        </section>

        <section style={S.libraryHeader}>
          <div>
            <h2 style={S.heading}>{libraryTab === 'templates' ? 'Templates' : 'Video library'}</h2>
            <p style={S.subtle}>Briefs, storyboards, HyperFrames source, renders, and validation artifacts.</p>
          </div>
          <div style={S.pipelinePills}>
            {['Brief', 'Storyboard', 'Source', 'Checks', 'Render'].map(step => <span key={step} style={S.pipelinePill}>{step}</span>)}
          </div>
        </section>

        {libraryTab === 'templates' ? (
          <div style={S.templateGrid}>
            {TEMPLATES.map(t => <TemplateCard key={t.label} template={t} onUse={() => createVideo(t)} />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyMark}>MP4</div>
            <h3 style={S.emptyTitle}>No matching productions yet</h3>
            <p style={S.emptyCopy}>Create one from the brief panel or start with a production template.</p>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? S.projectGrid : S.projectList}>
            {filteredProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                viewMode={viewMode}
                onOpen={() => onOpenProject(p.id)}
                onDelete={() => onDeleteProject(p.id)}
              />
            ))}
          </div>
        )}
      </main>

      <aside style={S.rightRail}>
        <section style={S.railCard}>
          <div style={S.railTitle}>Production readiness</div>
          <StatusRow label="Node" ok={system.node} />
          <StatusRow label="FFmpeg" ok={system.ffmpeg} />
          <StatusRow label="HyperFrames" ok={system.hyperframes} />
          <StatusRow label="Agent CLI" ok={agentCount > 0} />
        </section>

        <section style={S.railCard}>
          <div style={S.railTitle}>What Code2MP4 owns</div>
          {[
            'Structured storyboard before motion source',
            'Editable HTML/CSS/GSAP compositions',
            'Lint and inspect gates before render',
            'Deterministic MP4 output path',
          ].map(item => <div key={item} style={S.checkItem}><span style={S.checkDot} />{item}</div>)}
        </section>

        <section style={S.railCard}>
          <div style={S.railTitle}>Motion systems</div>
          <div style={S.swatches}>
            {['#58A6FF', '#C44F34', '#F2C94C', '#3FB950', '#B388FF', '#FF6B6B'].map(c => <span key={c} style={{ ...S.swatch, background: c }} />)}
          </div>
          <p style={S.railCopy}>Bind palette, typography, pacing, transitions, and render constraints into every composition.</p>
        </section>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.metric}>
      <div style={S.metricValue}>{value}</div>
      <div style={S.metricLabel}>{label}</div>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div style={S.statusRow}>
      <span style={{ ...S.statusDot, background: ok ? 'var(--success)' : 'var(--warning)' }} />
      <span>{label}</span>
      <span style={S.statusValue}>{ok ? 'Ready' : 'Missing'}</span>
    </div>
  );
}

function ProjectCard({
  project, viewMode, onOpen, onDelete,
}: {
  project: ProjectItem;
  viewMode: ViewMode;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const cfg = project.config ?? {};
  const videoType = String(cfg.videoType ?? 'custom');
  const orientation = String(cfg.orientation ?? '16:9');
  const duration = typeof cfg.duration === 'number' ? `${cfg.duration}s` : 'duration open';
  const motion = String(cfg.motionSystemId ?? 'unbound');

  return (
    <article
      style={viewMode === 'grid' ? S.projectCard : S.projectRow}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
    >
      <div style={viewMode === 'grid' ? S.thumb : S.rowThumb}>
        <div style={S.thumbGrid} />
        <span style={S.thumbText}>{orientation}</span>
      </div>
      <div style={S.projectBody}>
        <div style={S.projectTopLine}>
          <h3 style={S.projectTitle}>{project.name}</h3>
          <span style={S.statePill}>Draft</span>
        </div>
        <p style={S.projectMeta}>{videoType} · {duration} · {motion}</p>
        <div style={S.cardSteps}>
          {['brief', 'storyboard', 'source', 'render'].map((step, i) => (
            <span key={step} style={{ ...S.stepChip, opacity: i === 0 ? 1 : 0.48 }}>{step}</span>
          ))}
        </div>
      </div>
      <button
        style={S.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${project.name}`}
      >
        ×
      </button>
    </article>
  );
}

function TemplateCard({ template, onUse }: { template: typeof TEMPLATES[number]; onUse: () => void }) {
  return (
    <button style={S.templateCard} onClick={onUse}>
      <div style={S.templatePreview}>
        <span>{template.orientation}</span>
      </div>
      <div style={S.templateCardTitle}>{template.label}</div>
      <div style={S.templateCardMeta}>{template.type} · {template.duration}s</div>
      <p style={S.templateCardCopy}>{template.prompt}</p>
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'grid', gridTemplateColumns: '380px minmax(560px, 1fr) 300px', height: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' },
  leftRail: { borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'auto' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border)' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'var(--fg)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, letterSpacing: 0 },
  brandTitle: { fontSize: 18, fontWeight: 800, letterSpacing: 0 },
  brandSub: { fontSize: 12, color: 'var(--muted)', marginTop: 1 },
  agentBlock: { padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 },
  agentHint: { color: 'var(--muted)', fontSize: 12 },
  createPanel: { padding: 22, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' },
  sectionKicker: { color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, fontWeight: 700 },
  input: { width: '100%', height: 42, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px', fontSize: 14 },
  briefInput: { width: '100%', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--fg)', padding: 12, fontSize: 14, lineHeight: 1.55, resize: 'vertical', minHeight: 132 },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--muted)', fontSize: 11, fontWeight: 700 },
  select: { height: 36, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--fg)', padding: '0 9px' },
  segmented: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 4, background: 'var(--surface-hover)', borderRadius: 10 },
  segmentBtn: { border: 'none', background: 'transparent', color: 'var(--muted)', borderRadius: 7, padding: '7px 4px', fontSize: 11, cursor: 'pointer' },
  segmentBtnActive: { background: 'var(--bg)', color: 'var(--fg)', boxShadow: 'var(--shadow-sm)' },
  primaryBtn: { height: 44, border: 'none', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
  templateStack: { padding: '18px 22px 24px', display: 'flex', flexDirection: 'column', gap: 8 },
  templateBtn: { textAlign: 'left', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 10, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 },
  templateTitle: { color: 'var(--fg)', fontWeight: 700, fontSize: 13 },
  templateMeta: { color: 'var(--muted)', fontSize: 11 },
  main: { minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg)' },
  topBar: { minHeight: 70, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 18, padding: '0 28px', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5 },
  topTabs: { display: 'flex', alignItems: 'center', gap: 22 },
  topTab: { border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '24px 0 20px', borderBottom: '3px solid transparent' },
  topTabActive: { color: 'var(--fg)', borderBottomColor: 'var(--fg)' },
  searchWrap: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, width: 360, height: 42, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', padding: '0 12px' },
  searchIcon: { color: 'var(--muted)', fontSize: 16 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 14 },
  viewToggle: { display: 'flex', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 999, padding: 3 },
  iconBtn: { border: 'none', background: 'transparent', color: 'var(--muted)', borderRadius: 999, padding: '7px 11px', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  iconBtnActive: { background: 'var(--fg)', color: 'var(--bg)' },
  heroBand: { margin: 28, marginBottom: 18, padding: 24, border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, background: 'var(--surface)' },
  heroKicker: { color: 'var(--accent)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' },
  heroTitle: { margin: '8px 0 0', maxWidth: 640, fontSize: 28, lineHeight: 1.12, letterSpacing: 0 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, 96px)', gap: 10 },
  metric: { border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg)' },
  metricValue: { fontSize: 20, fontWeight: 800 },
  metricLabel: { color: 'var(--muted)', fontSize: 11, marginTop: 2 },
  libraryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '0 28px 18px' },
  heading: { margin: 0, fontSize: 20, fontWeight: 800 },
  subtle: { margin: '5px 0 0', color: 'var(--muted)', fontSize: 13 },
  pipelinePills: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pipelinePill: { border: '1px solid var(--border)', borderRadius: 999, padding: '5px 9px', color: 'var(--muted)', fontSize: 11, fontWeight: 700 },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, padding: '0 28px 32px' },
  projectList: { display: 'flex', flexDirection: 'column', gap: 10, padding: '0 28px 32px' },
  projectCard: { border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' },
  projectRow: { border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12, padding: 10, cursor: 'pointer', display: 'grid', gridTemplateColumns: '112px 1fr 32px', gap: 14, alignItems: 'center' },
  thumb: { height: 150, borderRadius: 10, background: '#050505', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 12 },
  rowThumb: { height: 64, borderRadius: 9, background: '#050505', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 8 },
  thumbGrid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,166,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.18) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.55 },
  thumbText: { position: 'relative', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800 },
  projectBody: { minWidth: 0 },
  projectTopLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  projectTitle: { margin: 0, color: 'var(--fg)', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statePill: { border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 999, padding: '3px 7px', fontSize: 10, fontWeight: 800 },
  projectMeta: { color: 'var(--muted)', fontSize: 12, margin: '6px 0 10px' },
  cardSteps: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  stepChip: { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 999, padding: '3px 7px', fontSize: 10, fontWeight: 700 },
  deleteBtn: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 },
  emptyState: { margin: '60px auto', textAlign: 'center', maxWidth: 420, color: 'var(--muted)' },
  emptyMark: { margin: '0 auto 16px', width: 74, height: 74, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-mono)' },
  emptyTitle: { color: 'var(--fg)', margin: 0, fontSize: 18 },
  emptyCopy: { marginTop: 8, color: 'var(--muted)' },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, padding: '0 28px 32px' },
  templateCard: { textAlign: 'left', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', padding: 14, cursor: 'pointer' },
  templatePreview: { height: 112, borderRadius: 10, background: '#050505', color: '#fff', display: 'flex', alignItems: 'flex-end', padding: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, marginBottom: 12 },
  templateCardTitle: { color: 'var(--fg)', fontWeight: 800, fontSize: 15 },
  templateCardMeta: { color: 'var(--accent)', fontSize: 12, marginTop: 3, fontWeight: 700 },
  templateCardCopy: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5, margin: '9px 0 0' },
  rightRail: { borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' },
  railCard: { border: '1px solid var(--border)', borderRadius: 13, background: 'var(--bg)', padding: 14 },
  railTitle: { color: 'var(--fg)', fontWeight: 800, fontSize: 13, marginBottom: 12 },
  statusRow: { display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12, padding: '7px 0', borderTop: '1px solid var(--border-soft)' },
  statusDot: { width: 7, height: 7, borderRadius: '50%' },
  statusValue: { color: 'var(--fg)', fontSize: 11, fontWeight: 700 },
  checkItem: { display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--muted)', fontSize: 12, lineHeight: 1.45, marginTop: 8 },
  checkDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 },
  swatches: { display: 'flex', gap: 8, marginBottom: 12 },
  swatch: { width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border)' },
  railCopy: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5, margin: 0 },
};
