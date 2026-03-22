// PC用サイドナビゲーション + 今日のサマリー
import React from 'react';
import ProgressBar from './ProgressBar';
import AdBanner from './AdBanner';
import { t, getLang } from '../i18n/index';

interface MedSummary {
  id: string;
  name: string;
  limitPerDay: number;
  todayTotal: number;
}

interface SideNavProps {
  active: 'home' | 'medications' | 'logs' | 'settings';
  medSummaries: MedSummary[];
  adFree?: boolean;
}

const navItems = [
  { key: 'home' as const, href: '/', icon: '🏠', labelKey: 'nav.home' },
  { key: 'medications' as const, href: '/medications', icon: '💊', labelKey: 'nav.medications' },
  { key: 'logs' as const, href: '/logs', icon: '📋', labelKey: 'nav.logs' },
  { key: 'settings' as const, href: '/settings', icon: '⚙️', labelKey: 'nav.settings' },
];

export default function SideNav({ active, medSummaries, adFree }: SideNavProps) {
  const lang = getLang();
  return (
    <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 bg-white border-r border-gray-100 p-4">
      <h1 className="text-lg font-bold text-amber-500 mb-6">ObatLog</h1>
      <nav className="space-y-1">
        {navItems.map(item => (
          <a key={item.key} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              ${active === item.key ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span>{item.icon}</span>
            <span>{t(item.labelKey as any, lang)}</span>
          </a>
        ))}
      </nav>
      {medSummaries.length > 0 && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">{t('sidebar.todaySummary' as any, lang)}</p>
          <div className="space-y-2">
            {medSummaries.map(med => (
              <div key={med.id}>
                <p className="text-xs text-gray-600 mb-1">{med.name}</p>
                <ProgressBar current={med.todayTotal} max={med.limitPerDay} />
              </div>
            ))}
          </div>
        </div>
      )}
      {!adFree && (
        <div className="mt-4">
          <AdBanner />
        </div>
      )}
    </aside>
  );
}
