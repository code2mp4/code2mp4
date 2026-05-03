import { useState, useCallback } from 'react';
import { navigate, useRoute } from './router';
import { EntryView } from './components/EntryView';
import { ProjectView } from './components/ProjectView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { VideoProjectConfig } from '@open-video/contracts';

interface ProjectItem {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

export function App() {
  const route = useRoute();
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const createProject = useCallback(async (name: string, config: VideoProjectConfig) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
    const project = await res.json();
    setProjects(prev => [...prev, project]);
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
        <ProjectView projectId={route.projectId} onBack={() => navigate({ kind: 'home' })} />
      ) : (
        <EntryView
          projects={projects}
          onCreateProject={createProject}
          onOpenProject={openProject}
          onDeleteProject={deleteProject}
        />
      )}
    </ErrorBoundary>
  );
}
