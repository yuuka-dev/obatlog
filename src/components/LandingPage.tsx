// ランディングページ（未認証ユーザー向け）
import React from 'react';
import { t, getLang } from '../i18n/index';
import LangSwitcher from './LangSwitcher';

export default function LandingPage() {
  const lang = getLang();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* ヒーローセクション */}
      <section className="px-6 pt-16 pb-12 text-center max-w-lg mx-auto">
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">{t('lp.langLabel' as any, lang)}</p>
          <LangSwitcher current={lang} />
        </div>
        <p className="text-sm text-gray-400 mb-2">{t('lp.brandLine' as any, lang)}</p>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {t('lp.hero.title' as any, lang)}
        </h1>
        <p className="text-gray-500 mb-8">
          {t('lp.hero.subtitle' as any, lang)}
        </p>
        <div className="flex flex-col items-center gap-3">
          <a href="/login"
            className="inline-block bg-amber-400 hover:bg-amber-500 text-white px-8 py-3 rounded-xl text-lg font-medium shadow-lg shadow-amber-200 transition">
            {t('lp.hero.cta' as any, lang)}
          </a>
          <a href="/demo"
            className="inline-block text-amber-500 hover:text-amber-600 text-sm underline transition">
            {t('lp.hero.demo' as any, lang)}
          </a>
        </div>
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

      {/* 利用例スクリーンショット */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-gray-700 text-center mb-6">
          {t('lp.screenshots.title' as any, lang)}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { src: '/sample-home.png', label: t('lp.screenshots.home' as any, lang) },
            { src: '/sample-medications.png', label: t('lp.screenshots.medications' as any, lang) },
            { src: '/sample-logs.png', label: t('lp.screenshots.logs' as any, lang) },
          ].map(item => (
            <div key={item.src} className="text-center">
              <img
                src={item.src}
                alt={item.label}
                className="rounded-xl shadow-md border border-gray-100 w-full"
                loading="lazy"
              />
              <p className="text-xs text-gray-500 mt-2">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* フッター */}
      <footer className="px-6 py-8 text-center text-xs text-gray-400">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/blog/" className="hover:text-gray-600 transition">
            ブログ
          </a>
          <a href="/privacy/" className="hover:text-gray-600 transition">
            {t('privacy' as any, lang)}
          </a>
          <a href="/terms/" className="hover:text-gray-600 transition">
            {t('terms' as any, lang)}
          </a>
        </div>
        <p className="mb-1">
          {t('lp.footer.operator' as any, lang)}{' '}
          <a href="https://osaka29.jp" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition">第29大阪技術局</a>
        </p>
        <p className="mb-2">
          {t('lp.footer.contact' as any, lang)}{' '}
          <a href="mailto:contract@osaka29.jp" className="hover:text-gray-600 transition">contract@osaka29.jp</a>
        </p>
        © 2026 ObatLog
      </footer>
    </div>
  );
}
