import { useEffect, useRef, useState } from 'react';
import type { VideoProjectConfig } from '@code2mp4/contracts';
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

type DemoKey = 'hero' | 'launch' | 'oss' | 'release' | 'demo';

const DEMO_BASE = 'https://raw.githubusercontent.com/code2mp4/code2mp4/main/docs';
const DEMOS: Record<DemoKey, { video: string; poster: string; alt: string }> = {
  hero: {
    video: DEMO_BASE + '/demo.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    alt: 'Code2MP4 demo showing an editable motion source becoming a rendered video',
  },
  launch: {
    video: DEMO_BASE + '/demos/demo-product-launch.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    alt: 'Product launch workflow demo rendered by Code2MP4',
  },
  oss: {
    video: DEMO_BASE + '/demos/demo-oss-intro.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    alt: 'Open source introduction video demo rendered by Code2MP4',
  },
  release: {
    video: DEMO_BASE + '/demos/demo-release-notes.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    alt: 'Release notes video demo rendered by Code2MP4',
  },
  demo: {
    video: DEMO_BASE + '/demo.mp4',
    poster: DEMO_BASE + '/demo-thumb.jpg',
    alt: 'Code2MP4 motion system demonstration',
  },
};

const VIDEO_TYPES = [
  { id: 'product-launch', label: 'Product launch', desc: 'Problem, promise, proof, CTA', demo: 'launch' as DemoKey },
  { id: 'social-short', label: 'Social short', desc: 'Fast vertical reel with kinetic captions', demo: 'oss' as DemoKey },
  { id: 'tutorial', label: 'Tutorial', desc: 'Step-by-step explainer with clear scenes', demo: 'release' as DemoKey },
  { id: 'brand-intro', label: 'Brand intro', desc: 'Logo reveal and motion identity opener', demo: 'demo' as DemoKey },
  { id: 'caption-reel', label: 'Caption reel', desc: 'Text-first rhythm synced to audio', demo: 'launch' as DemoKey },
] as const;

const TEMPLATES = [
  { label: 'Launch teaser', type: 'product-launch', duration: 15, orientation: '16:9', demo: 'launch' as DemoKey, prompt: '15-second product launch teaser. Dark studio canvas, product hero reveal, three crisp feature callouts, confident CTA.' },
  { label: 'Founder reel', type: 'social-short', duration: 10, orientation: '9:16', demo: 'oss' as DemoKey, prompt: '10-second vertical founder reel. Hook in the first second, bold kinetic captions, quick proof point, follow CTA.' },
  { label: 'Release notes', type: 'custom', duration: 25, orientation: '16:9', demo: 'release' as DemoKey, prompt: '25-second release notes video. Version title, three shipped improvements, one visual proof moment, upgrade CTA.' },
  { label: 'Logo sting', type: 'brand-intro', duration: 5, orientation: '16:9', demo: 'demo' as DemoKey, prompt: '5-second logo sting on a black video canvas. Signal-blue accent, precise grid reveal, short final hold.' },
] as const;

function DemoVideo({ demo, eager = false, className = '' }: { demo: DemoKey; eager?: boolean; className?: string }) {
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
        aria-label={source.alt}
      >
        {visible && <source src={source.video} type='video/mp4' />}
      </video>
      <span className='media-live'><span className='live-dot' /> Live preview</span>
    </div>
  );
}

function MediaImage({ demo, alt, className = '' }: { demo: DemoKey; alt: string; className?: string }) {
  return <img className={'demo-image ' + className} src={DEMOS[demo].poster} alt={alt} loading='lazy' decoding='async' />;
}

function VisualCard({ number, demo, eyebrow, title, copy, children }: { number: string; demo: DemoKey; eyebrow: string; title: string; copy: string; children?: React.ReactNode }) {
  return (
    <article className='visual-card'>
      <DemoVideo demo={demo} />
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
      .catch(() => setHealthError('Studio server offline'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter(project => {
    if (libraryTab === 'templates') return false;
    if (libraryTab === 'rendered' && project.pipeline?.status !== 'done') return false;
    if (libraryTab === 'drafts' && project.pipeline?.status === 'done') return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [project.name, project.config?.videoType, project.config?.orientation, project.config?.motionSystemId].join(' ').toLowerCase().includes(query);
  });

  const createVideo = (override?: typeof TEMPLATES[number]) => {
    const sourcePrompt = override?.prompt ?? prompt.trim();
    if (!sourcePrompt) return;
    const type = override?.type ?? videoType;
    const aspect = (override?.orientation ?? orientation) as VideoProjectConfig['orientation'];
    const length = override?.duration ?? duration;
    const name = (override?.label || projectName.trim() || sourcePrompt.slice(0, 56)).replace(/\s+/g, ' ').trim();
    onCreateProject(name || 'Untitled production', { videoType: type, orientation: aspect, duration: length, energy, motionSystemId: motionSystem, copy: sourcePrompt }, sourcePrompt);
  };

  const selectedType = VIDEO_TYPES.find(type => type.id === videoType) ?? VIDEO_TYPES[0];

  return (
    <div className='studio-shell' role='application' aria-label='Code2MP4 studio'>
      <header className='studio-topbar'>
        <div className='brand-lockup'>
          <div className='brand-mark'>C2</div>
          <div><div className='brand-name'>Code2MP4</div><div className='brand-caption'>Agent-native video production</div></div>
        </div>
        <nav className='studio-nav' aria-label='Studio sections'>
          <a className='nav-active' href='#create'>Create</a>
          <a href='#workflows'>Workflows</a>
          <a href='#library'>Library</a>
        </nav>
        <div className='topbar-tools'>
          <div className='system-pill' aria-live='polite'><span className={system.hyperframes ? 'status-dot status-ready' : 'status-dot'} />{loading ? 'Checking render stack' : healthError || (system.hyperframes ? 'Render stack ready' : 'Connect render stack')}</div>
          <AgentPicker selectedAgentId={selectedAgentId} onSelectAgent={onSelectAgent} />
        </div>
      </header>

      <main>
        <section className='hero-section' id='create'>
          <div className='hero-copy'>
            <div className='eyebrow'><span className='eyebrow-line' /> Creative pipeline / 01</div>
            <h1>From a thought<br /><em>to a finished frame.</em></h1>
            <p className='hero-lede'>Code2MP4 turns a plain-language brief into editable motion source, then renders the deterministic MP4 your idea was heading toward.</p>
            <div className='hero-proof'>
              <div className='proof-item'><strong>{projects.length.toString().padStart(2, '0')}</strong><span>productions</span></div>
              <div className='proof-item'><strong>{agentCount || '—'}</strong><span>agents detected</span></div>
              <div className='proof-item'><strong>4K</strong><span>render ready</span></div>
            </div>
          </div>
          <div className='hero-demo-wrap'>
            <DemoVideo demo='hero' eager className='hero-demo' />
            <div className='hero-demo-overlay overlay-top'><span className='overlay-label'>Output / motion source</span><span className='overlay-value'>editable.html</span></div>
            <div className='hero-demo-overlay overlay-bottom'><span className='overlay-label'>Final render</span><span className='overlay-value'>MP4 · 00:15</span><span className='render-signal'><i /><i /><i /></span></div>
          </div>
        </section>

        <section className='create-stage' aria-labelledby='create-title'>
          <div className='stage-visual'>
            <div className='section-index'>01 <span>Brief to motion</span></div>
            <div className='pipeline-visual' aria-label='Brief to motion to MP4 workflow'>
              <div className='pipeline-node pipeline-source'><span className='node-kicker'>INPUT</span><strong>“Make it feel<br />like launch day.”</strong><small>your creative brief</small></div>
              <div className='pipeline-connector'><span>→</span><i /></div>
              <div className='pipeline-node pipeline-process'><span className='node-kicker'>DIRECTOR</span><strong>Scene map<br />+ motion system</strong><small>agent orchestration</small></div>
              <div className='pipeline-connector'><span>→</span><i /></div>
              <div className='pipeline-node pipeline-output'><span className='node-kicker'>OUTPUT</span><strong>editable.html<br />+ final.mp4</strong><small>deterministic render</small></div>
            </div>
          </div>
          <div className='create-panel'>
            <div className='panel-kicker'>Start a production</div>
            <h2 id='create-title'>Give the director a direction.</h2>
            <p className='panel-copy'>Describe the moment, not the implementation. Your selected agent handles the scenes, copy, timing, and motion system.</p>
            <label className='field-label' htmlFor='production-prompt'>Creative brief</label>
            <textarea id='production-prompt' value={prompt} onChange={event => setPrompt(event.target.value)} placeholder='A 15-second launch film for a new developer tool…' rows={4} />
            <div className='field-row'>
              <div className='field-group'><label className='field-label' htmlFor='project-name'>Production name</label><input id='project-name' value={projectName} onChange={event => setProjectName(event.target.value)} placeholder='Untitled production' /></div>
              <div className='field-group'><label className='field-label' htmlFor='video-type'>Format</label><select id='video-type' value={videoType} onChange={event => setVideoType(event.target.value)}>{VIDEO_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div>
            </div>
            <div className='control-row'>
              <div><span className='field-label'>Canvas</span><div className='segmented-control'>{(['16:9', '9:16', '1:1'] as const).map(value => <button type='button' key={value} className={orientation === value ? 'segment-active' : ''} onClick={() => setOrientation(value)} aria-pressed={orientation === value}>{value}</button>)}</div></div>
              <div><span className='field-label'>Length</span><div className='segmented-control'>{[5, 10, 15, 30].map(value => <button type='button' key={value} className={duration === value ? 'segment-active' : ''} onClick={() => setDuration(value)} aria-pressed={duration === value}>{value}s</button>)}</div></div>
            </div>
            <div className='advanced-row'><label><span>Motion system</span><select value={motionSystem} onChange={event => setMotionSystem(event.target.value)}><option value='tech'>Tech / precise</option><option value='editorial'>Editorial / bold</option><option value='cinematic'>Cinematic / slow</option><option value='organic'>Organic / warm</option></select></label><label><span>Energy</span><select value={energy} onChange={event => setEnergy(event.target.value)}><option value='calm'>Calm</option><option value='medium'>Balanced</option><option value='high'>High energy</option><option value='dramatic'>Dramatic</option></select></label></div>
            <button type='button' className='primary-cta' onClick={() => createVideo()} disabled={!prompt.trim()}><span>{prompt.trim() ? 'Create production' : 'Write a brief to begin'}</span><span className='cta-arrow'>↗</span></button>
            <div className='create-note'><span className='mini-check'>✓</span> {selectedType.label} · {selectedType.desc} · {system.ffmpeg ? 'FFmpeg ready' : 'Render stack checking'}</div>
          </div>
        </section>

        <section className='workflow-section' id='workflows' aria-labelledby='workflow-title'>
          <div className='section-heading-row'><div><div className='eyebrow'><span className='eyebrow-line' /> How the studio works</div><h2 id='workflow-title'>A production system that<br /><em>shows its work.</em></h2></div><p className='section-intro'>Every stage stays visible: brief, storyboard, motion source, quality checks, and the final render.</p></div>
          <div className='visual-grid'>
            <VisualCard number='01' demo='launch' eyebrow='Prompt → scenes' title='Brief to storyboard' copy='Turn a rough direction into a paced sequence of scenes, copy, and visual beats before the render starts.'><div className='card-link'>Open director <span>↗</span></div></VisualCard>
            <VisualCard number='02' demo='oss' eyebrow='Agents → source' title='Editable motion source' copy='Agents compose real HTML motion source you can inspect, remix, and keep under version control.'><div className='card-link'>Inspect the source <span>↗</span></div></VisualCard>
            <VisualCard number='03' demo='release' eyebrow='Checks → MP4' title='Deterministic rendering' copy='Quality checks run before assembly, then the same source produces a reproducible MP4 every time.'><div className='card-link'>View render checks <span>↗</span></div></VisualCard>
          </div>
        </section>

        <section className='template-section' aria-labelledby='template-title'>
          <div className='section-heading-row compact'><div><div className='eyebrow'><span className='eyebrow-line' /> Start with a shape</div><h2 id='template-title'>Production templates,<br /><em>already in motion.</em></h2></div><p className='section-intro'>Use a proven structure when the blank canvas is not the point. Your brief is still the source of truth.</p></div>
          <div className='template-rail'>{TEMPLATES.map(template => <article className='template-card' key={template.label}><button type='button' className='template-media-button' onClick={() => createVideo(template)} aria-label={'Use ' + template.label + ' template'}><DemoVideo demo={template.demo} /><span className='use-template'>Use template <b>↗</b></span></button><div className='template-info'><div><span className='template-type'>{template.type.replace('-', ' ')}</span><h3>{template.label}</h3></div><span className='template-meta'>{template.duration}s · {template.orientation}</span></div></article>)}</div>
        </section>

        <section className='library-section' id='library' aria-labelledby='library-title'>
          <div className='library-heading'><div><div className='eyebrow'><span className='eyebrow-line' /> Your workspace</div><h2 id='library-title'>Productions in progress.</h2></div><button type='button' className='secondary-cta' onClick={() => document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' })}>New production <span>+</span></button></div>
          <div className='library-toolbar'><div className='library-tabs' role='tablist' aria-label='Production filters'>{(['all', 'drafts', 'rendered', 'templates'] as LibraryTab[]).map(tab => <button type='button' role='tab' aria-selected={libraryTab === tab} className={libraryTab === tab ? 'tab-active' : ''} key={tab} onClick={() => setLibraryTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}<span>{tab === 'templates' ? TEMPLATES.length : tab === 'all' ? projects.length : tab === 'rendered' ? projects.filter(project => project.pipeline?.status === 'done').length : projects.filter(project => project.pipeline?.status !== 'done').length}</span></button>)}</div><div className='library-actions'><label className='search-field'><span aria-hidden='true'>⌕</span><input aria-label='Search productions' value={search} onChange={event => setSearch(event.target.value)} placeholder='Search productions' /></label><div className='view-toggle' aria-label='View mode'><button type='button' className={viewMode === 'grid' ? 'view-active' : ''} onClick={() => setViewMode('grid')} aria-label='Grid view'>▦</button><button type='button' className={viewMode === 'list' ? 'view-active' : ''} onClick={() => setViewMode('list')} aria-label='List view'>☷</button></div></div></div>
          {libraryTab === 'templates' ? <div className='library-template-callout'><MediaImage demo='release' alt='Release notes template preview' /><div><span className='panel-kicker'>Template library</span><h3>Choose a starting rhythm.</h3><p>Jump back to the template rail above to preview a real rendered outcome before you commit.</p><button type='button' className='secondary-cta' onClick={() => document.querySelector('.template-section')?.scrollIntoView({ behavior: 'smooth' })}>Browse templates ↗</button></div></div> : filteredProjects.length > 0 ? <div className={viewMode === 'grid' ? 'project-grid' : 'project-list'}>{filteredProjects.map(project => <ProjectCard key={project.id} project={project} viewMode={viewMode} onOpen={() => onOpenProject(project.id)} onDelete={() => onDeleteProject(project.id)} />)}</div> : <div className='empty-library'><MediaImage demo='hero' alt='A rendered Code2MP4 video preview' /><div><h3>Your next cut starts here.</h3><p>Write a brief above or launch a template. The finished production will appear in this library.</p><button type='button' className='secondary-cta' onClick={() => document.getElementById('production-prompt')?.focus()}>Write a brief ↗</button></div></div>}
        </section>
      </main>
      <footer className='studio-footer'><span>Code2MP4 / agent-native video production</span><span>{system.node ? 'Node ready' : 'Node checking'} · {system.ffmpeg ? 'FFmpeg ready' : 'FFmpeg checking'} · {system.hyperframes ? 'HyperFrames ready' : 'HyperFrames checking'}</span></footer>
    </div>
  );
}

function ProjectCard({ project, viewMode, onOpen, onDelete }: { project: ProjectItem; viewMode: ViewMode; onOpen: () => void; onDelete: () => void }) {
  const type = String(project.config?.videoType ?? 'product-launch');
  const demo: DemoKey = type === 'social-short' ? 'oss' : type === 'tutorial' ? 'release' : type === 'brand-intro' ? 'demo' : 'launch';
  const status = project.pipeline?.status === 'done' ? 'Rendered' : project.pipeline?.status ? project.pipeline.status.replaceAll('_', ' ') : 'Draft';
  const progress = project.pipeline?.totalScenes ? Math.round(((project.pipeline.scenesCompleted ?? 0) / project.pipeline.totalScenes) * 100) : project.pipeline?.status === 'done' ? 100 : 0;
  return <article className={'project-card ' + (viewMode === 'list' ? 'project-card-list' : '')}>
    <button type='button' className='project-media-button' onClick={onOpen} aria-label={'Open ' + project.name}><DemoVideo demo={demo} /><span className={'project-status ' + (project.pipeline?.status === 'done' ? 'status-rendered' : '')}>{status}</span></button>
    <div className='project-card-content'><div><span className='project-type'>{type.replace('-', ' ')}</span><h3>{project.name}</h3></div><div className='project-card-bottom'><span>{String(project.config?.orientation ?? '16:9')} · {String(project.config?.duration ?? '—')}s</span>{project.pipeline && <span className='project-progress'>{progress}%</span>}<button type='button' className='delete-button' onClick={event => { event.stopPropagation(); onDelete(); }} aria-label={'Delete ' + project.name}>Delete</button></div></div>
  </article>;
}
