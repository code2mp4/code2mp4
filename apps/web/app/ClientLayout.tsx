'use client';

import { I18nProvider, useT } from '../src/i18n/context';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

function LanguageToggle() {
  const { locale, setLocale, t } = useT();
  const toggle = useCallback(() => setLocale(locale === 'en' ? 'zh' : 'en'), [locale, setLocale]);
  return (
    <button
      onClick={toggle}
      title={t('lang.' + locale === 'en' ? 'zh' : 'en')}
      style={{
        position: 'fixed', top: 10, right: 16, zIndex: 1000,
        padding: '4px 10px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
        color: 'var(--fg)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
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
