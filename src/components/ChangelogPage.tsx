// 更新履歴ページ: releases.json をバージョン降順で表示
'use client';

import { getLang, t } from '../i18n/index';
import releases from '../i18n/releases.json';

type ReleaseEntry = { date: string; changes: Record<string, string[]> };
const typedReleases = releases as Record<string, ReleaseEntry>;

// セマンティックバージョンを降順ソート
function sortVersionsDesc(versions: string[]): string[] {
  return versions.sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pb[i] - pa[i];
    }
    return 0;
  });
}

export default function ChangelogPage() {
  const lang = getLang();
  const versions = sortVersionsDesc(Object.keys(typedReleases));

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <a href="/settings" className="text-sm text-gray-400 hover:text-gray-600">
        {t('legal.back' as any, lang)}
      </a>
      <h1 className="text-xl font-bold text-gray-800">
        {t('changelog.title' as any, lang)}
      </h1>

      {versions.map(version => {
        const entry = typedReleases[version];
        const changes = entry.changes[lang] ?? entry.changes['en'] ?? entry.changes['ja'] ?? [];

        return (
          <section key={version} className="bg-white border rounded-lg px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800">v{version}</h2>
              <span className="text-xs text-gray-400">{entry.date}</span>
            </div>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              {changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
