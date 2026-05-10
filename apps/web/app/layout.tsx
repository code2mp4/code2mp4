import type { Metadata } from 'next';
import { ClientLayout } from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Code2MP4 — Agent-native video pipeline',
  description: 'Prompt in, editable motion source out, deterministic MP4 rendered.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
