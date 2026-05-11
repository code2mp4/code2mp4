'use client';

import { I18nProvider, useT } from '../src/i18n/context';
import type { ReactNode } from 'react';
import { useState } from 'react';

function SettingsMenu() {
  const { locale, setLocale, t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}
    >
      {open && (
        <div
          role="menu"
          aria-label={t('settings.title')}
          style={{
            width: 220, border: '1px solid var(--border)', borderRadius: 14,
            background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', padding: 12,
          }}
        >
          <div style={{ color: 'var(--fg)', fontSize: 13, fontWeight: 900, marginBottom: 10 }}>{t('settings.title')}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800, marginBottom: 7 }}>{t('settings.language')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(['en', 'zh'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                role="menuitemradio"
                aria-checked={locale === l}
                style={{
                  border: '1px solid var(--border)', borderRadius: 9, padding: '8px 9px',
                  background: locale === l ? 'var(--fg)' : 'var(--bg)',
                  color: locale === l ? 'var(--bg)' : 'var(--fg)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 900,
                }}
              >
                {t(`lang.${l}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        title={t('settings.title')}
        aria-label={t('settings.title')}
        data-testid="settings-button"
        style={{
          height: 42, minWidth: 42, padding: '0 13px', border: '1px solid var(--border)',
          borderRadius: 999, background: 'var(--fg)', color: 'var(--bg)', fontSize: 13,
          fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: 'var(--shadow-lg)', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
        }}
      >
        <span aria-hidden="true">⚙</span>
        <span>{locale === 'zh' ? '中文' : 'EN'}</span>
      </button>
    </div>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <SettingsMenu />
      {children}
    </I18nProvider>
  );
}
