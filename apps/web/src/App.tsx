import { useState, useCallback, useEffect } from 'react';
import { navigate, useRoute } from './router';
import { EntryView } from './components/EntryView';
import { ProjectView } from './components/ProjectView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { VideoProjectConfig } from '@code2mp4/contracts';

interface ProjectItem {
  id: string;
  name: string;
  config?: Record<string, unknown>;
  pipeline?: ProjectPipelineSummary | null;
}

interface ProjectPipelineSummary {
  id: string;
  status: string;
  scenesCompleted?: number;
  totalScenes?: number;
  render?: { status?: string };
}

export function App() {
  const route = useRoute();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<{ projectId: string; prompt: string } | null>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(d => {
        if (d.defaultAgentId) {
          setSelectedAgentId(d.defaultAgentId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((items: unknown) => {
        if (!Array.isArray(items)) return;
        const normalized = items.map(normalizeProject);
        setProjects(normalized);
        hydrateProjectPipelines(normalized);
      })
      .catch(() => {});
  }, []);

  async function hydrateProjectPipelines(items: ProjectItem[]) {
    const enriched = await Promise.all(items.map(async (project) => {
      try {
        const res = await fetch(`/api/projects/${project.id}/pipeline/latest`);
        if (!res.ok) return project;
        const pipeline = await res.json();
        return { ...project, pipeline };
      } catch {
        return project;
      }
    }));
    setProjects(enriched);
  }

  const createProject = useCallback(async (name: string, config: VideoProjectConfig, initialPrompt?: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
    const project = normalizeProject(await res.json());
    setProjects(prev => [...prev, project]);
    if (initialPrompt?.trim()) {
      setPendingPrompt({ projectId: project.id, prompt: initialPrompt.trim() });
    }
    navigate({ kind: 'project', projectId: project.id });
  }, []);

  const openProject = useCallback((id: string) => navigate({ kind: 'project', projectId: id }), []);
  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      {route.kind === 'project' ? (
        <ProjectView
          projectId={route.projectId}
          onBack={() => navigate({ kind: 'home' })}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          initialPrompt={pendingPrompt?.projectId === route.projectId ? pendingPrompt.prompt : undefined}
          onInitialPromptConsumed={() => setPendingPrompt(null)}
        />
      ) : (
        <EntryView
          projects={projects}
          onCreateProject={createProject}
          onOpenProject={openProject}
          onDeleteProject={deleteProject}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
        />
      )}
    </ErrorBoundary>
  );
}

function normalizeProject(raw: unknown): ProjectItem {
  const p = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const config =
    p.config && typeof p.config === 'object' && !Array.isArray(p.config)
      ? p.config as Record<string, unknown>
      : parseConfigJson(typeof p.configJson === 'string' ? p.configJson : undefined);
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? 'Untitled Video'),
    config,
  };
}

function parseConfigJson(configJson?: string): Record<string, unknown> {
  if (!configJson) return {};
  try {
    const parsed = JSON.parse(configJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
