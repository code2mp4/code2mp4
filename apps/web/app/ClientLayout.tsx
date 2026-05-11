'use client';

import { I18nProvider, useT } from '../src/i18n/context';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

function LanguageToggle() {
  const { locale, setLocale, t } = useT();
  const toggle = useCallback(() => setLocale(locale === 'en' ? 'zh' : 'en'), [locale, setLocale]);
  const nextLocale = locale === 'en' ? 'zh' : 'en';
  return (
    <button
      onClick={toggle}
      title={t(`lang.${nextLocale}`)}
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 20,
        padding: '4px 10px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
        color: 'var(--fg)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit',
        boxShadow: 'var(--shadow-sm)', opacity: 0.88,
      }}
    >
      {locale === 'en' ? '中文' : 'EN'}
    </button>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LanguageToggle />
      {children}
    </I18nProvider>
  );
}
