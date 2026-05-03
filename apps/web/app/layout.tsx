import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Open Video — AI Video Production',
  description: 'AI-driven video production powered by HyperFrames',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
