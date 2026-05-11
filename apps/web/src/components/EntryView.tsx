import { useEffect, useMemo, useState } from 'react';
import type { VideoProjectConfig } from '@code2mp4/contracts';
import { useT } from '../i18n/context';
import { useViewportWidth } from '../hooks/useViewportWidth';
import { AgentPicker } from './AgentPicker';

interface ProjectItem {
  id: string;
  name: string;
  config?: Record<string, unknown>;
  pipeline?: {
    id: string;
    status: string;
    scenesCompleted?: number;
    totalScenes?: number;
    render?: { status?: string };
  } | null;
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
  const viewportWidth = useViewportWidth();
  const isNarrow = viewportWidth < 1180;
  const isMobile = viewportWidth < 760;
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [system, setSystem] = useState<{ node?: boolean; ffmpeg?: boolean; hyperframes?: boolean }>({});
  const { t } = useT();
  const tl = useMemo(() => ({
    studio: t('entry.studio'), tagline: t('entry.tagline'),
    // Form labels
    newProduction: t('entry.newProduction'),
    type: t('entry.type'), custom: t('entry.custom'), ratio: t('entry.ratio'),
    duration: t('entry.duration'), motion: t('entry.motion'), energy: t('entry.motion'),
    start: t('entry.startProduction'), projectName: t('entry.projectName'),
    describe: t('entry.describePlaceholder'),
    // Energy
    calm: t('entry.energy.calm'), medium: t('entry.energy.medium'),
    high: t('entry.energy.high'), dramatic: t('entry.energy.dramatic'),
    // Video types
    'product-launch': t('entry.videoType.productLaunch'),
    'social-short': t('entry.videoType.socialShort'),
    tutorial: t('entry.videoType.tutorial'),
    'brand-intro': t('entry.videoType.brandIntro'),
    'caption-reel': t('entry.videoType.captionReel'),
    // Templates
    launchTeaser: t('entry.template.launchTeaser'),
    launchTeaserPrompt: t('entry.template.launchTeaser.prompt'),
    founderReel: t('entry.template.founderReel'),
    founderReelPrompt: t('entry.template.founderReel.prompt'),
    releaseNotes: t('entry.template.releaseNotes'),
    releaseNotesPrompt: t('entry.template.releaseNotes.prompt'),
    logoSting: t('entry.template.logoSting'),
    logoStingPrompt: t('entry.template.logoSting.prompt'),
    // Library
    tabs: t('entry.library.tabs'), drafts: t('entry.library.drafts'),
    rendered: t('entry.library.rendered'), libraryTemplates: t('entry.library.templates'),
    search: t('entry.library.searchPlaceholder'), grid: t('entry.library.grid'),
    list: t('entry.library.list'), emptyTitle: t('entry.library.empty.title'),
    emptyDesc: t('entry.library.empty.desc'),
    heroKicker: t('entry.library.heroKicker'), heroTitle: t('entry.library.heroTitle'),
    library: t('entry.library.videoLibrary'), libraryDesc: t('entry.library.videoLibraryDesc'),
    projects: t('entry.library.projects'), agents: t('entry.library.agents'),
    runtime: t('entry.library.runtime'), ready: t('entry.ready'),
    checking: t('entry.checkingRuntime'), missing: t('entry.missing'),
    // Readiness
    readiness: t('entry.readiness'), node: t('entry.readiness.node'),
    ffmpeg: t('entry.readiness.ffmpeg'), hf: t('entry.readiness.hyperframes'),
    agentCli: t('entry.readiness.agentCli'), whatOwns: t('entry.readiness.whatOwns'),
    own1: t('entry.readiness.own1'), own2: t('entry.readiness.own2'),
    own3: t('entry.readiness.own3'), own4: t('entry.readiness.own4'),
    motionSystems: t('entry.readiness.motionSystems'), motionDesc: t('entry.readiness.motionDesc'),
    serverOffline: t('entry.serverOffline'),
    // Misc
    draft: t('entry.library.draft'), durationOpen: t('entry.library.durationOpen'),
    unbound: t('entry.library.unbound'), runtimeReady: t('entry.library.runtimeReady'),
    runtimeCheck: t('entry.library.runtimeCheck'), templates: t('entry.templates'),
    brief: t('entry.library.brief'), storyboard: t('entry.library.storyboard'),
    source: t('entry.library.source'), checks: t('entry.library.checks'),
    render: t('entry.library.render'),
    useLaunchTemplate: t('entry.library.useLaunchTemplate'),
    browseTemplates: t('entry.library.browseTemplates'),
    openProduction: t('entry.library.openProduction'),
  } as Record<string,string>), [t]);
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
      .catch(() => setHealthError(t('entry.serverOffline')))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (libraryTab === 'templates') return false;
      if (libraryTab === 'rendered' && p.pipeline?.status !== 'done') return false;
      if (libraryTab === 'drafts' && p.pipeline?.status === 'done') return false;
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
    onCreateProject(name || t('app.untitled'), {
      videoType: type,
      orientation: aspect,
      duration: length,
      energy,
      motionSystemId: motionSystem,
      copy: sourcePrompt,
    }, sourcePrompt);
  };

  return (
    <div style={{ ...S.shell, ...(isNarrow ? S.shellNarrow : {}) }} role="application" aria-label={tl.studio}>
      <aside style={{ ...S.leftRail, ...(isNarrow ? S.leftRailNarrow : {}) }}>
        <div style={S.brandRow}>
          <div style={S.logoMark}>C2</div>
          <div>
            <div style={S.brandTitle}>Code2MP4</div>
            <div style={S.brandSub}>{tl.tagline}</div>
          </div>
        </div>

        <div style={S.agentBlock}>
          <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
          <div style={S.agentHint}>
            {loading ? tl.checking : healthError ? healthError : `${agentCount} agents · HyperFrames ${system.hyperframes ? tl.ready : tl.missing}`}
          </div>
        </div>

        <section style={{ ...S.createPanel, ...(isNarrow ? S.createPanelNarrow : {}), ...(isMobile ? S.createPanelMobile : {}) }}>
          <div style={S.sectionKicker}>{t('entry.newProduction')}</div>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder={tl.projectName}
            style={S.input}
          />
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={tl.describe}
            rows={6}
            style={S.briefInput}
          />

          <div style={{ ...S.fieldGrid, ...(isMobile ? S.fieldGridMobile : {}) }}>
            <label style={S.fieldLabel}>
              {t('entry.type')}
              <select value={videoType} onChange={e => setVideoType(e.target.value)} style={S.select}>
                {VIDEO_TYPES.map(v => <option key={v.id} value={v.id}>{tl[v.id]}</option>)}
                <option value="custom">{tl.custom}</option>
              </select>
            </label>
            <label style={S.fieldLabel}>
              {t('entry.ratio')}
              <select value={orientation} onChange={e => setOrientation(e.target.value as '16:9' | '9:16' | '1:1')} style={S.select}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <label style={S.fieldLabel}>
              {t('entry.duration')}
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={S.select}>
                {[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v}s</option>)}
              </select>
            </label>
            <label style={S.fieldLabel}>
              {tl.motion}
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
                {tl[v] || v}
              </button>
            ))}
          </div>

          <button onClick={() => createVideo()} disabled={!prompt.trim()} style={{ ...S.primaryBtn, opacity: prompt.trim() ? 1 : 0.45 }}>
            {t('entry.startProduction')}
          </button>
        </section>

        <section style={S.templateStack}>
          <div style={S.sectionKicker}>{tl.templates}</div>
          {TEMPLATES.map(t => (
            <button key={t.label} style={S.templateBtn} onClick={() => createVideo(t)}>
              <span style={S.templateTitle}>{templateLabel(t.label, tl)}</span>
              <span style={S.templateMeta}>{t.type} · {t.duration}s · {t.orientation}</span>
            </button>
          ))}
        </section>
      </aside>

      <main style={{ ...S.main, ...(isNarrow ? S.mainNarrow : {}) }}>
        <header style={{ ...S.topBar, ...(isMobile ? S.topBarMobile : {}) }}>
          <nav style={S.topTabs} aria-label={tl.studio}>
            {(['all', 'drafts', 'rendered', 'templates'] as LibraryTab[]).map(tab => (
              <button key={tab} onClick={() => setLibraryTab(tab)} style={{ ...S.topTab, ...(libraryTab === tab ? S.topTabActive : {}) }}>
                {tabLabel(tab, tl)}
              </button>
            ))}
          </nav>
          <div style={{ ...S.searchWrap, ...(isMobile ? S.searchWrapMobile : {}) }}>
            <span style={S.searchIcon}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tl.search} style={S.searchInput} />
          </div>
          <div style={S.viewToggle}>
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              style={{ ...S.iconBtn, ...(viewMode === 'grid' ? S.iconBtnActive : {}) }}
            >
              <span aria-hidden="true">▦</span>{tl.grid}
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              style={{ ...S.iconBtn, ...(viewMode === 'list' ? S.iconBtnActive : {}) }}
            >
              <span aria-hidden="true">☰</span>{tl.list}
            </button>
          </div>
        </header>

        <section style={{ ...S.heroBand, ...(isMobile ? S.heroBandMobile : {}) }}>
          <div>
            <div style={S.heroKicker}>{tl.heroKicker}</div>
            <h1 style={S.heroTitle}>{tl.heroTitle}</h1>
          </div>
          <div style={{ ...S.metrics, ...(isMobile ? S.metricsMobile : {}) }}>
            <Metric label={tl.projects} value={String(projects.length)} />
            <Metric label={tl.agents} value={String(agentCount)} />
            <Metric label={tl.runtime} value={system.hyperframes ? tl.runtimeReady : tl.runtimeCheck} />
          </div>
        </section>

        <section style={{ ...S.libraryHeader, ...(isMobile ? S.libraryHeaderMobile : {}) }}>
          <div>
            <h2 style={S.heading}>{libraryTab === 'templates' ? tl.libraryTemplates : tl.library}</h2>
            <p style={S.subtle}>{tl.libraryDesc}</p>
          </div>
          <div style={S.pipelinePills}>
            {[tl.brief, tl.storyboard, tl.source, tl.checks, tl.render].map(step => <span key={step} style={S.pipelinePill}>{step}</span>)}
          </div>
        </section>

        {libraryTab === 'templates' ? (
          <div style={S.templateGrid}>
            {TEMPLATES.map(t => <TemplateCard key={t.label} template={t} onUse={() => createVideo(t)} tl={tl} />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyMark}>MP4</div>
            <h3 style={S.emptyTitle}>{tl.emptyTitle}</h3>
            <p style={S.emptyCopy}>{tl.emptyDesc}</p>
            <div style={S.emptyActions}>
              <button style={S.emptyPrimary} onClick={() => createVideo(TEMPLATES[0])}>{tl.useLaunchTemplate}</button>
              <button style={S.emptySecondary} onClick={() => setLibraryTab('templates')}>{tl.browseTemplates}</button>
            </div>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? { ...S.projectGrid, ...(isMobile ? S.projectGridMobile : {}) } : S.projectList}>
            {filteredProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                viewMode={viewMode}
                onOpen={() => onOpenProject(p.id)}
                onDelete={() => onDeleteProject(p.id)}
                t={t}
                tl={tl}
              />
            ))}
          </div>
        )}
      </main>

      <aside style={{ ...S.rightRail, ...(isNarrow ? S.rightRailNarrow : {}) }}>
        <section style={S.railCard}>
          <div style={S.railTitle}>{tl.readiness}</div>
          <StatusRow label={tl.node} ok={system.node} ready={tl.ready} missing={tl.missing} />
          <StatusRow label={tl.ffmpeg} ok={system.ffmpeg} ready={tl.ready} missing={tl.missing} />
          <StatusRow label={tl.hf} ok={system.hyperframes} ready={tl.ready} missing={tl.missing} />
          <StatusRow label={tl.agentCli} ok={agentCount > 0} ready={tl.ready} missing={tl.missing} />
        </section>

        <section style={S.railCard}>
          <div style={S.railTitle}>{tl.whatOwns}</div>
          {[
            tl.own1,
            tl.own2,
            tl.own3,
            tl.own4,
          ].map(item => <div key={item} style={S.checkItem}><span style={S.checkDot} />{item}</div>)}
        </section>

        <section style={S.railCard}>
          <div style={S.railTitle}>{tl.motionSystems}</div>
          <div style={S.swatches}>
            {['#58A6FF', '#C44F34', '#F2C94C', '#3FB950', '#B388FF', '#FF6B6B'].map(c => <span key={c} style={{ ...S.swatch, background: c }} />)}
          </div>
          <p style={S.railCopy}>{tl.motionDesc}</p>
        </section>
      </aside>
    </div>
  );
}

function tabLabel(tab: LibraryTab, tl: Record<string, string>): string {
  if (tab === 'all') return tl.tabs;
  if (tab === 'drafts') return tl.drafts;
  if (tab === 'rendered') return tl.rendered;
  return tl.libraryTemplates;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.metric}>
      <div style={S.metricValue}>{value}</div>
      <div style={S.metricLabel}>{label}</div>
    </div>
  );
}

function StatusRow({ label, ok, ready, missing }: { label: string; ok?: boolean; ready: string; missing: string }) {
  return (
    <div style={S.statusRow}>
      <span style={{ ...S.statusDot, background: ok ? 'var(--success)' : 'var(--warning)' }} />
      <span>{label}</span>
      <span style={S.statusValue}>{ok ? ready : missing}</span>
    </div>
  );
}

function ProjectCard({
  project, viewMode, onOpen, onDelete, t, tl,
}: {
  project: ProjectItem;
  viewMode: ViewMode;
  onOpen: () => void;
  onDelete: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tl: Record<string, string>;
}) {
  const cfg = project.config ?? {};
  const videoType = String(cfg.videoType ?? 'custom');
  const orientation = String(cfg.orientation ?? '16:9');
  const duration = typeof cfg.duration === 'number' ? `${cfg.duration}s` : 'duration open';
  const motion = String(cfg.motionSystemId ?? 'unbound');
  const state = project.pipeline?.status ?? 'draft';
  const rendered = state === 'done';
  const sceneCount = project.pipeline?.totalScenes
    ? t('entry.pipeline.scenes', { done: project.pipeline.scenesCompleted ?? 0, total: project.pipeline.totalScenes })
    : t('entry.pipeline.noPipeline');

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
          <span style={{ ...S.statePill, ...(rendered ? S.statePillDone : {}) }}>{pipelineStateLabel(state, t)}</span>
        </div>
        <p style={S.projectMeta}>{videoType} · {duration} · {motion}</p>
        <div style={S.cardSteps}>
          {[tl.brief, tl.storyboard, tl.source, tl.checks, tl.render].map((step, i) => (
            <span key={step} style={{ ...S.stepChip, opacity: stepDone(state, i) ? 1 : 0.48 }}>{step}</span>
          ))}
        </div>
        <div style={S.projectMeta}>{sceneCount}</div>
        <button
          style={S.openBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {tl.openProduction}
        </button>
      </div>
      <button
        style={S.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={t('entry.library.deleteProject', { name: project.name })}
      >
        ×
      </button>
    </article>
  );
}

function pipelineStateLabel(status: string, t: (key: string) => string): string {
  const label = t(`entry.pipeline.state.${status}`);
  return label.startsWith('entry.pipeline.state.') ? status : label;
}

function stepDone(status: string, index: number): boolean {
  const rank: Record<string, number> = {
    draft: 0,
    scripting: 1,
    awaiting_approval: 2,
    rendering_scenes: 3,
    checking: 4,
    ready_to_render: 4,
    assembling: 5,
    done: 5,
    failed: 1,
    cancelled: 1,
  };
  return (rank[status] ?? 0) > index;
}

function TemplateCard({ template, onUse, tl }: { template: typeof TEMPLATES[number]; onUse: () => void; tl: Record<string, string> }) {
  return (
    <button style={S.templateCard} onClick={onUse}>
      <div style={S.templatePreview}>
        <span>{template.orientation}</span>
      </div>
      <div style={S.templateCardTitle}>{templateLabel(template.label, tl)}</div>
      <div style={S.templateCardMeta}>{template.type} · {template.duration}s</div>
      <p style={S.templateCardCopy}>{templatePrompt(template.label, template.prompt, tl)}</p>
    </button>
  );
}

function templateLabel(label: string, tl: Record<string, string>): string {
  if (label === 'Launch teaser') return tl.launchTeaser;
  if (label === 'Founder reel') return tl.founderReel;
  if (label === 'Release notes') return tl.releaseNotes;
  if (label === 'Logo sting') return tl.logoSting;
  return label;
}

function templatePrompt(label: string, fallback: string, tl: Record<string, string>): string {
  if (label === 'Launch teaser') return tl.launchTeaserPrompt;
  if (label === 'Founder reel') return tl.founderReelPrompt;
  if (label === 'Release notes') return tl.releaseNotesPrompt;
  if (label === 'Logo sting') return tl.logoStingPrompt;
  return fallback;
}

const S: Record<string, React.CSSProperties> = {
  shell: { display: 'grid', gridTemplateColumns: '380px minmax(560px, 1fr) 300px', height: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' },
  shellNarrow: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' },
  leftRail: { borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'auto' },
  leftRailNarrow: { borderRight: 'none', borderBottom: '1px solid var(--border)', overflow: 'visible' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border)' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: 'var(--fg)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, letterSpacing: 0 },
  brandTitle: { fontSize: 18, fontWeight: 800, letterSpacing: 0 },
  brandSub: { fontSize: 12, color: 'var(--muted)', marginTop: 1 },
  agentBlock: { padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 },
  agentHint: { color: 'var(--muted)', fontSize: 12 },
  createPanel: { padding: 22, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' },
  createPanelNarrow: { display: 'flex', flexDirection: 'column' },
  createPanelMobile: { display: 'flex', flexDirection: 'column' },
  sectionKicker: { color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, fontWeight: 700 },
  input: { width: '100%', height: 42, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px', fontSize: 14 },
  briefInput: { width: '100%', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--fg)', padding: 12, fontSize: 14, lineHeight: 1.55, resize: 'vertical', minHeight: 132 },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  fieldGridMobile: { gridTemplateColumns: '1fr' },
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
  mainNarrow: { overflow: 'visible' },
  topBar: { minHeight: 70, borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'auto minmax(180px, 1fr) auto', alignItems: 'center', gap: 14, padding: '0 28px', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 5 },
  topBarMobile: { display: 'flex', alignItems: 'stretch', flexDirection: 'column', gap: 10, padding: '14px 22px' },
  topTabs: { display: 'flex', alignItems: 'center', gap: 4, padding: 4, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 999, flexShrink: 0 },
  topTab: { border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '8px 14px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', lineHeight: 1 },
  topTabActive: { color: 'var(--bg)', background: 'var(--fg)', boxShadow: 'var(--shadow-sm)' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, height: 42, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', padding: '0 12px' },
  searchWrapMobile: { width: '100%', marginLeft: 0 },
  searchIcon: { color: 'var(--muted)', fontSize: 16 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 14 },
  viewToggle: { display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 999, padding: 3, justifySelf: 'end', flexShrink: 0 },
  iconBtn: { minWidth: 68, border: 'none', background: 'transparent', color: 'var(--muted)', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', lineHeight: 1 },
  iconBtnActive: { background: 'var(--fg)', color: 'var(--bg)' },
  heroBand: { margin: 28, marginBottom: 18, padding: 24, border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, background: 'var(--surface)' },
  heroBandMobile: { margin: 22, flexDirection: 'column', alignItems: 'stretch', padding: 20 },
  heroKicker: { color: 'var(--accent)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' },
  heroTitle: { margin: '8px 0 0', maxWidth: 640, fontSize: 28, lineHeight: 1.12, letterSpacing: 0 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, 96px)', gap: 10 },
  metricsMobile: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  metric: { border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg)' },
  metricValue: { fontSize: 20, fontWeight: 800 },
  metricLabel: { color: 'var(--muted)', fontSize: 11, marginTop: 2 },
  libraryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '0 28px 18px' },
  libraryHeaderMobile: { alignItems: 'flex-start', flexDirection: 'column', padding: '0 22px 18px' },
  heading: { margin: 0, fontSize: 20, fontWeight: 800 },
  subtle: { margin: '5px 0 0', color: 'var(--muted)', fontSize: 13 },
  pipelinePills: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pipelinePill: { border: '1px solid var(--border)', borderRadius: 999, padding: '5px 9px', color: 'var(--muted)', fontSize: 11, fontWeight: 700 },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, padding: '0 28px 32px' },
  projectGridMobile: { gridTemplateColumns: '1fr', padding: '0 22px 28px' },
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
  statePillDone: { borderColor: 'var(--success)', color: 'var(--success)', background: 'var(--success-dim)' },
  projectMeta: { color: 'var(--muted)', fontSize: 12, margin: '6px 0 10px' },
  cardSteps: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  stepChip: { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 999, padding: '3px 7px', fontSize: 10, fontWeight: 700 },
  openBtn: { marginTop: 12, width: '100%', border: '1px solid var(--fg)', background: 'var(--fg)', color: 'var(--bg)', borderRadius: 9, padding: '9px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 800 },
  deleteBtn: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 },
  emptyState: { margin: '60px auto', textAlign: 'center', maxWidth: 420, color: 'var(--muted)' },
  emptyMark: { margin: '0 auto 16px', width: 74, height: 74, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-mono)' },
  emptyTitle: { color: 'var(--fg)', margin: 0, fontSize: 18 },
  emptyCopy: { marginTop: 8, color: 'var(--muted)' },
  emptyActions: { marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  emptyPrimary: { border: 'none', background: 'var(--fg)', color: 'var(--bg)', borderRadius: 9, padding: '10px 13px', cursor: 'pointer', fontWeight: 800, fontSize: 12 },
  emptySecondary: { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', borderRadius: 9, padding: '9px 13px', cursor: 'pointer', fontWeight: 800, fontSize: 12 },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, padding: '0 28px 32px' },
  templateCard: { textAlign: 'left', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', padding: 14, cursor: 'pointer' },
  templatePreview: { height: 112, borderRadius: 10, background: '#050505', color: '#fff', display: 'flex', alignItems: 'flex-end', padding: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, marginBottom: 12 },
  templateCardTitle: { color: 'var(--fg)', fontWeight: 800, fontSize: 15 },
  templateCardMeta: { color: 'var(--accent)', fontSize: 12, marginTop: 3, fontWeight: 700 },
  templateCardCopy: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5, margin: '9px 0 0' },
  rightRail: { borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' },
  rightRailNarrow: { borderLeft: 'none', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', overflow: 'visible' },
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
