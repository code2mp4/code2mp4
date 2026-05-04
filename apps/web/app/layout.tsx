import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Code2MP4 — Prompt-to-MP4 for coding agents',
  description: 'AI-driven video production powered by HyperFrames',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
