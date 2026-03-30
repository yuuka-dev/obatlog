// バージョン更新通知モーダル
// localStorage の lastSeenVersion と NEXT_PUBLIC_APP_VERSION を比較し、
// 差分がある場合に更新内容をモーダル表示する。
import { useState, useEffect } from 'react';
import { getLang, t } from '../i18n/index';
import releases from '../i18n/releases.json';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
const LS_KEY = 'lastSeenVersion';

interface UpdateModalProps {
  isDemo: boolean;
}

export default function UpdateModal({ isDemo }: UpdateModalProps) {
  const [visible, setVisible] = useState(false);
  const lang = getLang();

  useEffect(() => {
    // デモユーザーは表示しない
    if (isDemo) return;

    try {
      const lastSeen = localStorage.getItem(LS_KEY);
      if (!lastSeen) {
        // 初回利用: モーダルを出さず、現在のバージョンをセットするだけ
        localStorage.setItem(LS_KEY, APP_VERSION);
        return;
      }
      if (lastSeen !== APP_VERSION) {
        setVisible(true);
      }
    } catch {
      // localStorage がブロックされている場合は無視
    }
  }, [isDemo]);

  function handleClose() {
    setVisible(false);
    try {
      localStorage.setItem(LS_KEY, APP_VERSION);
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  // releases.json からバージョンの変更点を取得（フォールバック: 汎用文言）
  const releaseData = (releases as Record<string, { date: string; changes: Record<string, string[]> }>)[APP_VERSION];
  const changes = releaseData?.changes[lang] ?? releaseData?.changes['en'] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800">
          {t('update.title' as any, lang)}
        </h2>
        <p className="text-sm text-gray-600">
          {(t('update.message' as any, lang) as string).replace('{version}', APP_VERSION)}
        </p>

        {changes && (
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            {changes.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <a
            href="/changelog/"
            className="text-center text-sm text-amber-600 hover:text-amber-700 transition"
          >
            {t('update.showChangelog' as any, lang)}
          </a>
          <button
            onClick={handleClose}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white py-2 rounded-lg transition text-sm"
          >
            {t('update.close' as any, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
