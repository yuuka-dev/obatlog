// デモバナー: 24時間限定デモの残り時間とアカウント作成導線
import { useState, useEffect } from 'react';
import { getLang, t } from '../i18n/index';

interface DemoBannerProps {
  expiresAtSeconds: number;
  isPC: boolean;
}

// 残り時間を「○時間○分」形式でフォーマット
function formatRemaining(seconds: number, lang: string): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (lang === 'ja') return `${hours}時間${minutes}分`;
  if (lang === 'id') return `${hours} jam ${minutes} menit`;
  return `${hours}h ${minutes}m`;
}

export default function DemoBanner({ expiresAtSeconds, isPC }: DemoBannerProps) {
  const lang = getLang();
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, expiresAtSeconds - Math.floor(Date.now() / 1000))
  );

  // 1分ごとに残り時間を更新
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAtSeconds - Math.floor(Date.now() / 1000));
      setRemainingSeconds(remaining);
    }, 60_000);
    return () => clearInterval(timer);
  }, [expiresAtSeconds]);

  const timeText = formatRemaining(remainingSeconds, lang);
  const remainingLabel = (t('demo.bannerRemaining' as any, lang) as string).replace('{time}', timeText);

  return (
    <div
      className={`bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm ${isPC ? 'ml-56' : ''}`}
      style={{ zIndex: 60 }}
    >
      <span className="text-amber-700 font-medium">
        {t('demo.banner' as any, lang)}
      </span>
      <span className="text-amber-600 mx-2">·</span>
      <span className="text-amber-600">{remainingLabel}</span>
      <span className="text-amber-600 mx-2">·</span>
      <a
        href="/login/"
        className="text-amber-500 hover:text-amber-600 underline transition"
      >
        {t('demo.bannerSignUp' as any, lang)}
      </a>
    </div>
  );
}
