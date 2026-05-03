'use client';
import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('../src/App').then((m) => ({ default: m.App })), {
  ssr: false,
});

export default function Home() {
  return <AppShell />;
}
