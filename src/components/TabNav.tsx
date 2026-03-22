// 下部タブナビゲーション（全画面共通）
import { t, getLang } from '../i18n/index';

interface Props {
  active: 'home' | 'medications' | 'logs' | 'settings';
}

export default function TabNav({ active }: Props) {
  const lang = getLang();
  const tabs = [
    { key: 'home' as const, href: '/', label: t('nav.home', lang), icon: '🏠' },
    { key: 'medications' as const, href: '/medications', label: t('nav.medications', lang), icon: '💊' },
    { key: 'logs' as const, href: '/logs', label: t('nav.logs', lang), icon: '📋' },
    { key: 'settings' as const, href: '/settings', label: t('nav.settings' as any, lang), icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {tabs.map(tab => (
        <a
          key={tab.key}
          href={tab.href}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition
            ${active === tab.key ? 'text-amber-500 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
