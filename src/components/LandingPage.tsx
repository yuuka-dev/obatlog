// ランディングページ（未認証ユーザー向け）
import React from 'react';
import { t, getLang } from '../i18n/index';

export default function LandingPage() {
  const lang = getLang();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* ヒーローセクション */}
      <section className="px-6 pt-16 pb-12 text-center max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {t('lp.hero.title' as any, lang)}
        </h1>
        <p className="text-gray-500 mb-8">
          {t('lp.hero.subtitle' as any, lang)}
        </p>
        <a href="/login"
          className="inline-block bg-amber-400 hover:bg-amber-500 text-white px-8 py-3 rounded-xl text-lg font-medium shadow-lg shadow-amber-200 transition">
          {t('lp.hero.cta' as any, lang)}
        </a>
      </section>

      {/* 特徴3カード */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <div className="space-y-4">
          {[
            { icon: '📝', key: 'lp.features.record', color: 'bg-amber-50 border-amber-200' },
            { icon: '💊', key: 'lp.features.check', color: 'bg-green-50 border-green-200' },
            { icon: '🔔', key: 'lp.features.notify', color: 'bg-blue-50 border-blue-200' },
          ].map(feature => (
            <div key={feature.key}
              className={`${feature.color} border rounded-xl p-4 flex items-center gap-4`}>
              <span className="text-2xl">{feature.icon}</span>
              <p className="font-medium text-gray-700">{t(feature.key as any, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* フッター */}
      <footer className="px-6 py-8 text-center text-xs text-gray-400">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-600 transition">
            {t('privacy' as any, lang)}
          </a>
          <a href="/terms" className="hover:text-gray-600 transition">
            {t('terms' as any, lang)}
          </a>
        </div>
        © 2026 ObatLog
      </footer>
    </div>
  );
}
