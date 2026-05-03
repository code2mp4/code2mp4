/**
 * Minimal URL router — mirroring open-design's router.ts pattern.
 * Two routes: home and project/{id}.
 */
import { useEffect, useState } from 'react';

export type Route =
  | { kind: 'home' }
  | { kind: 'project'; projectId: string };

export function parseRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] === 'projects' && parts[1]) {
    return { kind: 'project', projectId: decodeURIComponent(parts[1]) };
  }
  return { kind: 'home' };
}

export function buildPath(route: Route): string {
  if (route.kind === 'home') return '/';
  return `/projects/${encodeURIComponent(route.projectId)}`;
}

export function navigate(route: Route): void {
  const target = buildPath(route);
  if (target === window.location.pathname) return;
  window.history.pushState(null, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname),
  );
  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
