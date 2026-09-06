import { useEffect, useRef, useState } from 'react';
import type { VideoProjectConfig } from '@code2mp4/contracts';
import { AgentPicker } from './AgentPicker';
import { useT } from '../i18n/context';

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

type DemoKey = 'hero' | 'launch' | 'oss' | 'release' | 'demo';

const DEMO_BASE = 'https://raw.githubusercontent.com/code2mp4/code2mp4/main/docs';
const DEMOS: Record<DemoKey, { video: string; poster: string; altKey: string }> = {
  hero: {
    video: DEMO_BASE + '/demo.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    altKey: 'entry.visual.alt.hero',
  },
  launch: {
    video: DEMO_BASE + '/demos/demo-product-launch.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    altKey: 'entry.visual.alt.launch',
  },
  oss: {
    video: DEMO_BASE + '/demos/demo-oss-intro.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    altKey: 'entry.visual.alt.oss',
  },
  release: {
    video: DEMO_BASE + '/demos/demo-release-notes.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    altKey: 'entry.visual.alt.release',
  },
  demo: {
    video: DEMO_BASE + '/demo.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    altKey: 'entry.visual.alt.motion',
  },
};

const VIDEO_TYPES = [
  { id: 'product-launch', labelKey: 'entry.videoType.productLaunch', descKey: 'entry.videoType.productLaunch.desc', demo: 'launch' as DemoKey },
  { id: 'social-short', labelKey: 'entry.videoType.socialShort', descKey: 'entry.videoType.socialShort.desc', demo: 'oss' as DemoKey },
  { id: 'tutorial', labelKey: 'entry.videoType.tutorial', descKey: 'entry.videoType.tutorial.desc', demo: 'release' as DemoKey },
  { id: 'brand-intro', labelKey: 'entry.videoType.brandIntro', descKey: 'entry.videoType.brandIntro.desc', demo: 'demo' as DemoKey },
  { id: 'caption-reel', labelKey: 'entry.videoType.captionReel', descKey: 'entry.videoType.captionReel.desc', demo: 'launch' as DemoKey },
] as const;

const TEMPLATES = [
  { labelKey: 'entry.template.launchTeaser', type: 'product-launch', duration: 15, orientation: '16:9', demo: 'launch' as DemoKey, promptKey: 'entry.template.launchTeaser.prompt' },
  { labelKey: 'entry.template.founderReel', type: 'social-short', duration: 10, orientation: '9:16', demo: 'oss' as DemoKey, promptKey: 'entry.template.founderReel.prompt' },
  { labelKey: 'entry.template.releaseNotes', type: 'custom', duration: 25, orientation: '16:9', demo: 'release' as DemoKey, promptKey: 'entry.template.releaseNotes.prompt' },
  { labelKey: 'entry.template.logoSting', type: 'brand-intro', duration: 5, orientation: '16:9', demo: 'demo' as DemoKey, promptKey: 'entry.template.logoSting.prompt' },
] as const;

function DemoVideo({ demo, label, liveLabel, eager = false, className = '' }: { demo: DemoKey; label: string; liveLabel: string; eager?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(eager);
  const source = DEMOS[demo];

  useEffect(() => {
    if (eager || !ref.current || typeof IntersectionObserver === 'undefined') return;
    const node = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !visible) return;
    const play = () => video.play().catch(() => undefined);
    play();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) play();
      else video.pause();
    }, { rootMargin: '120px 0px' });
    if (observer) observer.observe(video);
    return () => observer?.disconnect();
  }, [visible]);

  return (
    <div className={'demo-media ' + className}>
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        poster={source.poster}
        preload={visible ? 'metadata' : 'none'}
        aria-label={label}
      >
        {visible && <source src={source.video} type='video/mp4' />}
      </video>
      <span className='media-live'><span className='live-dot' /> {liveLabel}</span>
    </div>
  );
}

function MediaImage({ demo, alt, className = '' }: { demo: DemoKey; alt: string; className?: string }) {
  return <img className={'demo-image ' + className} src={DEMOS[demo].poster} alt={alt} loading='lazy' decoding='async' />;
}

function VisualCard({ number, demo, mediaLabel, liveLabel, eyebrow, title, copy, children }: { number: string; demo: DemoKey; mediaLabel: string; liveLabel: string; eyebrow: string; title: string; copy: string; children?: React.ReactNode }) {
  return (
    <article className='visual-card'>
      <DemoVideo demo={demo} label={mediaLabel} liveLabel={liveLabel} />
      <div className='visual-card-body'>
        <div className='visual-card-meta'><span>{number}</span><span>{eyebrow}</span></div>
        <h3>{title}</h3>
        <p>{copy}</p>
        {children}
      </div>
    </article>
  );
}

export function EntryView({ projects, onCreateProject, onOpenProject, onDeleteProject, selectedAgentId, onSelectAgent }: Props) {
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [system, setSystem] = useState<{ node?: boolean; ffmpeg?: boolean; hyperframes?: boolean }>({});
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [videoType, setVideoType] = useState('product-launch');
  const [orientation, setOrientation] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState(15);
  const [motionSystem, setMotionSystem] = useState('tech');
  const [energy, setEnergy] = useState('medium');

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        setAgentCount(data.detectedAgents ?? 0);
        setSystem(data.system ?? {});
        setHealthError(null);
      })
      .catch(() => setHealthError(t('entry.serverOffline')))
      .finally(() => setLoading(false));
  }, [t]);

  const filteredProjects = projects.filter(project => {
    if (libraryTab === 'templates') return false;
    if (libraryTab === 'rendered' && project.pipeline?.status !== 'done') return false;
    if (libraryTab === 'drafts' && project.pipeline?.status === 'done') return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [project.name, project.config?.videoType, project.config?.orientation, project.config?.motionSystemId].join(' ').toLowerCase().includes(query);
  });

  const createVideo = (override?: typeof TEMPLATES[number]) => {
    const sourcePrompt = override ? t(override.promptKey) : prompt.trim();
    if (!sourcePrompt) return;
    const type = override?.type ?? videoType;
    const aspect = (override?.orientation ?? orientation) as VideoProjectConfig['orientation'];
    const length = override?.duration ?? duration;
    const name = ((override ? t(override.labelKey) : '') || projectName.trim() || sourcePrompt.slice(0, 56)).replace(/\s+/g, ' ').trim();
    onCreateProject(name || t('app.untitled'), { videoType: type, orientation: aspect, duration: length, energy, motionSystemId: motionSystem, copy: sourcePrompt }, sourcePrompt);
  };

  const selectedType = VIDEO_TYPES.find(type => type.id === videoType) ?? VIDEO_TYPES[0];
  const vt = (key: string, vars?: Record<string, string | number>) => t('entry.visual.' + key, vars);
  const demoLabel = (demo: DemoKey) => t(DEMOS[demo].altKey);

  return (
    <div className='studio-shell' aria-label={t('entry.studio')}>
      <header className='studio-topbar'>
        <div className='brand-lockup'>
          <div className='brand-mark'>C2</div>
          <div><div className='brand-name'>Code2MP4</div><div className='brand-caption'>{vt('brandCaption')}</div></div>
        </div>
        <nav className='studio-nav' aria-label={vt('navLabel')}>
          <a className='nav-active' href='#create'>{vt('navCreate')}</a>
          <a href='#workflows'>{vt('navWorkflows')}</a>
          <a href='#library'>{vt('navLibrary')}</a>
        </nav>
        <div className='topbar-tools'>
          <div className='system-pill' aria-live='polite'><span className={system.hyperframes ? 'status-dot status-ready' : 'status-dot'} />{loading ? vt('statusChecking') : healthError || (system.hyperframes ? vt('statusReady') : vt('statusConnect'))}</div>
          <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
        </div>
      </header>

      <main>
        <section className='hero-section' id='create'>
          <div className='hero-copy'>
            <div className='eyebrow'><span className='eyebrow-line' /> {vt('heroKicker')}</div>
            <h1>{vt('heroTitle')}<br /><em>{vt('heroTitleAccent')}</em></h1>
            <p className='hero-lede'>{vt('heroCopy')}</p>
            <div className='hero-proof'>
              <div className='proof-item'><strong>{projects.length.toString().padStart(2, '0')}</strong><span>{vt('proofProductions')}</span></div>
              <div className='proof-item'><strong>{agentCount || '—'}</strong><span>{vt('proofAgents')}</span></div>
              <div className='proof-item'><strong>4K</strong><span>{vt('proofRender')}</span></div>
            </div>
          </div>
          <div className='hero-demo-wrap'>
            <DemoVideo demo='hero' label={demoLabel('hero')} liveLabel={vt('livePreview')} eager className='hero-demo' />
            <div className='hero-demo-overlay overlay-top'><span className='overlay-label'>{vt('motionOutput')}</span><span className='overlay-value'>editable.html</span></div>
            <div className='hero-demo-overlay overlay-bottom'><span className='overlay-label'>{vt('finalRender')}</span><span className='overlay-value'>MP4 · 00:15</span><span className='render-signal'><i /><i /><i /></span></div>
          </div>
        </section>

        <section className='create-stage' aria-labelledby='create-title'>
          <div className='stage-visual'>
            <div className='section-index'>01 <span>{vt('briefToMotion')}</span></div>
            <div className='pipeline-visual' aria-label={vt('pipelineAria')}>
              <div className='pipeline-node pipeline-source'><span className='node-kicker'>{vt('input')}</span><strong>{vt('promptLine1')}<br />{vt('promptLine2')}</strong><small>{vt('creativeBrief')}</small></div>
              <div className='pipeline-connector'><span>→</span><i /></div>
              <div className='pipeline-node pipeline-process'><span className='node-kicker'>{vt('director')}</span><strong>{vt('sceneMap')}<br />{vt('motionSystem')}</strong><small>{vt('agentOrchestration')}</small></div>
              <div className='pipeline-connector'><span>→</span><i /></div>
              <div className='pipeline-node pipeline-output'><span className='node-kicker'>{vt('output')}</span><strong>editable.html<br />+ final.mp4</strong><small>{vt('deterministicRender')}</small></div>
            </div>
          </div>
          <div className='create-panel'>
            <div className='panel-kicker'>{vt('startProduction')}</div>
            <h2 id='create-title'>{vt('createTitle')}</h2>
            <p className='panel-copy'>{vt('createCopy')}</p>
            <label className='field-label' htmlFor='production-prompt'>{vt('creativeBrief')}</label>
            <textarea id='production-prompt' value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={vt('promptPlaceholder')} rows={4} />
            <div className='field-row'>
              <div className='field-group'><label className='field-label' htmlFor='project-name'>{vt('productionName')}</label><input id='project-name' value={projectName} onChange={event => setProjectName(event.target.value)} placeholder={t('app.untitled')} /></div>
              <div className='field-group'><label className='field-label' htmlFor='video-type'>{vt('format')}</label><select id='video-type' value={videoType} onChange={event => setVideoType(event.target.value)}>{VIDEO_TYPES.map(type => <option key={type.id} value={type.id}>{t(type.labelKey)}</option>)}</select></div>
            </div>
            <div className='control-row'>
              <div><span className='field-label'>{vt('canvas')}</span><div className='segmented-control'>{(['16:9', '9:16', '1:1'] as const).map(value => <button type='button' key={value} className={orientation === value ? 'segment-active' : ''} onClick={() => setOrientation(value)} aria-pressed={orientation === value}>{value}</button>)}</div></div>
              <div><span className='field-label'>{vt('length')}</span><div className='segmented-control'>{[5, 10, 15, 30].map(value => <button type='button' key={value} className={duration === value ? 'segment-active' : ''} onClick={() => setDuration(value)} aria-pressed={duration === value}>{value}s</button>)}</div></div>
            </div>
            <div className='advanced-row'><label><span>{vt('motionSystemLabel')}</span><select value={motionSystem} onChange={event => setMotionSystem(event.target.value)}><option value='tech'>{vt('motionTech')}</option><option value='editorial'>{vt('motionEditorial')}</option><option value='cinematic'>{vt('motionCinematic')}</option><option value='organic'>{vt('motionOrganic')}</option></select></label><label><span>{t('entry.energy')}</span><select value={energy} onChange={event => setEnergy(event.target.value)}><option value='calm'>{t('entry.energy.calm')}</option><option value='medium'>{t('entry.energy.medium')}</option><option value='high'>{t('entry.energy.high')}</option><option value='dramatic'>{t('entry.energy.dramatic')}</option></select></label></div>
            <button type='button' className='primary-cta' onClick={() => createVideo()} disabled={!prompt.trim()}><span>{prompt.trim() ? vt('createProduction') : vt('writeBrief')}</span><span className='cta-arrow'>↗</span></button>
            <div className='create-note'><span className='mini-check'>✓</span> {t(selectedType.labelKey)} · {t(selectedType.descKey)} · {system.ffmpeg ? vt('ffmpegReady') : vt('statusChecking')}</div>
          </div>
        </section>

        <section className='workflow-section' id='workflows' aria-labelledby='workflow-title'>
          <div className='section-heading-row'><div><div className='eyebrow'><span className='eyebrow-line' /> {vt('workflowKicker')}</div><h2 id='workflow-title'>{vt('workflowTitle')}<br /><em>{vt('workflowTitleAccent')}</em></h2></div><p className='section-intro'>{vt('workflowCopy')}</p></div>
          <div className='visual-grid'>
            <VisualCard number='01' demo='launch' mediaLabel={demoLabel('launch')} liveLabel={vt('livePreview')} eyebrow={vt('feature1Eyebrow')} title={vt('feature1Title')} copy={vt('feature1Copy')}><div className='card-link'>{vt('feature1Action')} <span>↗</span></div></VisualCard>
            <VisualCard number='02' demo='oss' mediaLabel={demoLabel('oss')} liveLabel={vt('livePreview')} eyebrow={vt('feature2Eyebrow')} title={vt('feature2Title')} copy={vt('feature2Copy')}><div className='card-link'>{vt('feature2Action')} <span>↗</span></div></VisualCard>
            <VisualCard number='03' demo='release' mediaLabel={demoLabel('release')} liveLabel={vt('livePreview')} eyebrow={vt('feature3Eyebrow')} title={vt('feature3Title')} copy={vt('feature3Copy')}><div className='card-link'>{vt('feature3Action')} <span>↗</span></div></VisualCard>
          </div>
        </section>

        <section className='template-section' aria-labelledby='template-title'>
          <div className='section-heading-row compact'><div><div className='eyebrow'><span className='eyebrow-line' /> {vt('templatesKicker')}</div><h2 id='template-title'>{vt('templatesTitle')}<br /><em>{vt('templatesTitleAccent')}</em></h2></div><p className='section-intro'>{vt('templatesCopy')}</p></div>
          <div className='template-rail'>{TEMPLATES.map(template => <article className='template-card' key={template.labelKey}><button type='button' className='template-media-button' onClick={() => createVideo(template)} aria-label={vt('useTemplateAria', { name: t(template.labelKey) })}><DemoVideo demo={template.demo} label={demoLabel(template.demo)} liveLabel={vt('livePreview')} /><span className='use-template'>{vt('useTemplate')} <b>↗</b></span></button><div className='template-info'><div><span className='template-type'>{t('entry.videoType.' + (template.type === 'product-launch' ? 'productLaunch' : template.type === 'social-short' ? 'socialShort' : template.type === 'brand-intro' ? 'brandIntro' : 'tutorial'))}</span><h3>{t(template.labelKey)}</h3></div><span className='template-meta'>{template.duration}s · {template.orientation}</span></div></article>)}</div>
        </section>

        <section className='library-section' id='library' aria-labelledby='library-title'>
          <div className='library-heading'><div><div className='eyebrow'><span className='eyebrow-line' /> {vt('workspaceKicker')}</div><h2 id='library-title'>{vt('libraryTitle')}</h2></div><button type='button' className='secondary-cta' onClick={() => document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' })}>{t('entry.newProduction')} <span>+</span></button></div>
          <div className='library-toolbar'><div className='library-tabs' role='group' aria-label={vt('filtersLabel')}>{(['all', 'drafts', 'rendered', 'templates'] as LibraryTab[]).map(tab => <button type='button' aria-pressed={libraryTab === tab} className={libraryTab === tab ? 'tab-active' : ''} key={tab} onClick={() => setLibraryTab(tab)}>{tab === 'all' ? vt('all') : t('entry.library.' + tab)}<span>{tab === 'templates' ? TEMPLATES.length : tab === 'all' ? projects.length : tab === 'rendered' ? projects.filter(project => project.pipeline?.status === 'done').length : projects.filter(project => project.pipeline?.status !== 'done').length}</span></button>)}</div><div className='library-actions'><label className='search-field'><span aria-hidden='true'>⌕</span><input aria-label={vt('searchAria')} value={search} onChange={event => setSearch(event.target.value)} placeholder={vt('searchPlaceholder')} /></label><div className='view-toggle' aria-label={vt('viewMode')}><button type='button' className={viewMode === 'grid' ? 'view-active' : ''} onClick={() => setViewMode('grid')} aria-label={t('entry.library.grid')}>▦</button><button type='button' className={viewMode === 'list' ? 'view-active' : ''} onClick={() => setViewMode('list')} aria-label={t('entry.library.list')}>☷</button></div></div></div>
          {libraryTab === 'templates' ? <div className='library-template-callout'><MediaImage demo='release' alt={vt('templatePreviewAlt')} /><div><span className='panel-kicker'>{vt('templateLibrary')}</span><h3>{vt('templateCalloutTitle')}</h3><p>{vt('templateCalloutCopy')}</p><button type='button' className='secondary-cta' onClick={() => document.querySelector('.template-section')?.scrollIntoView({ behavior: 'smooth' })}>{t('entry.library.browseTemplates')} ↗</button></div></div> : filteredProjects.length > 0 ? <div className={viewMode === 'grid' ? 'project-grid' : 'project-list'}>{filteredProjects.map(project => <ProjectCard key={project.id} project={project} viewMode={viewMode} onOpen={() => onOpenProject(project.id)} onDelete={() => onDeleteProject(project.id)} t={t} liveLabel={vt('livePreview')} />)}</div> : <div className='empty-library'><MediaImage demo='hero' alt={vt('emptyPreviewAlt')} /><div><h3>{vt('emptyTitle')}</h3><p>{vt('emptyCopy')}</p><button type='button' className='secondary-cta' onClick={() => document.getElementById('production-prompt')?.focus()}>{vt('writeBriefAction')} ↗</button></div></div>}
        </section>
      </main>
      <footer className='studio-footer'><span>Code2MP4 / {vt('brandCaption')}</span><span>{system.node ? vt('nodeReady') : vt('nodeChecking')} · {system.ffmpeg ? vt('ffmpegReady') : vt('ffmpegChecking')} · {system.hyperframes ? vt('hyperframesReady') : vt('hyperframesChecking')}</span></footer>
    </div>
  );
}

function ProjectCard({ project, viewMode, onOpen, onDelete, t, liveLabel }: { project: ProjectItem; viewMode: ViewMode; onOpen: () => void; onDelete: () => void; t: (key: string, vars?: Record<string, string | number>) => string; liveLabel: string }) {
  const type = String(project.config?.videoType ?? 'product-launch');
  const demo: DemoKey = type === 'social-short' ? 'oss' : type === 'tutorial' ? 'release' : type === 'brand-intro' ? 'demo' : 'launch';
  const status = t('entry.pipeline.state.' + (project.pipeline?.status ?? 'draft'));
  const progress = project.pipeline?.totalScenes ? Math.round(((project.pipeline.scenesCompleted ?? 0) / project.pipeline.totalScenes) * 100) : project.pipeline?.status === 'done' ? 100 : 0;
  return <article className={'project-card ' + (viewMode === 'list' ? 'project-card-list' : '')}>
    <button type='button' className='project-media-button' onClick={onOpen} aria-label={t('entry.visual.openProductionAria', { name: project.name })}><DemoVideo demo={demo} label={t(DEMOS[demo].altKey)} liveLabel={liveLabel} /><span className={'project-status ' + (project.pipeline?.status === 'done' ? 'status-rendered' : '')}>{status}</span></button>
    <div className='project-card-content'><div><span className='project-type'>{type.replace('-', ' ')}</span><h3>{project.name}</h3></div><div className='project-card-bottom'><span>{String(project.config?.orientation ?? '16:9')} · {String(project.config?.duration ?? '—')}s</span>{project.pipeline && <span className='project-progress'>{progress}%</span>}<button type='button' className='delete-button' onClick={event => { event.stopPropagation(); onDelete(); }} aria-label={t('entry.library.deleteProject', { name: project.name })}>{t('entry.visual.delete')}</button></div></div>
  </article>;
}
