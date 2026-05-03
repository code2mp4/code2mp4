import { useState, useCallback } from 'react';
import { navigate, useRoute } from './router';
import { EntryView } from './components/EntryView';
import { ProjectView } from './components/ProjectView';
import type { VideoProject, VideoProjectConfig } from '@open-video/contracts';

export function App() {
  const route = useRoute();
  const [projects, setProjects] = useState<VideoProject[]>([]);

  const createProject = useCallback(
    async (name: string, config: VideoProjectConfig) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config }),
      });
      const project = await res.json();
      setProjects((prev) => [...prev, project]);
      navigate({ kind: 'project', projectId: project.id });
    },
    [],
  );

  const openProject = useCallback(
    (id: string) => navigate({ kind: 'project', projectId: id }),
    [],
  );

  const deleteProject = useCallback(async (id: string) => {
    // Project deletion not yet implemented on server; remove from local state
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  if (route.kind === 'project') {
    return (
      <ProjectView
        projectId={route.projectId}
        onBack={() => navigate({ kind: 'home' })}
      />
    );
  }

  return (
    <EntryView
      projects={projects}
      onCreateProject={createProject}
      onOpenProject={openProject}
      onDeleteProject={deleteProject}
    />
  );
}
