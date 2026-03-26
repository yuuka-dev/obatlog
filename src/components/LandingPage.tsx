// ランディングページ（未認証ユーザー向け）
import React from 'react';
import { t, getLang } from '../i18n/index';
import LangSwitcher from './LangSwitcher';

export default function LandingPage() {
  const lang = getLang();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* ヘッダーナビ */}
      <nav className="px-6 pt-4 max-w-lg mx-auto flex justify-between items-center">
        <span className="text-sm font-bold text-gray-700">ObatLog</span>
        <a href="/blog/" className="text-sm text-amber-500 hover:text-amber-600 transition">
          ブログ
        </a>
      </nav>

      {/* ヒーローセクション */}
      <section className="px-6 pt-12 pb-12 text-center max-w-lg mx-auto">
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

      {/* 薬学生ブログ（機能カード直後、スクショの上） */}
      <section className="bg-blue-50/50 px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-700">
              開発者ブログ、はじめました
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              ObatLogの使い方や、おくすりの豆知識をお届けします
            </p>
          </div>
          <div className="space-y-3">
            {[
              { href: '/blog/prevent-forgetting/', icon: '💊', title: '飲み忘れを防ぐコツ', desc: '薬の飲み忘れを減らすための実践的なテクニック' },
              { href: '/blog/medication-routine/', icon: '📅', title: '服薬を習慣化する方法', desc: '薬を毎日続けるためのモチベーション維持と習慣づくり' },
              { href: '/blog/getting-started/', icon: '🚀', title: 'ObatLogの始め方', desc: 'アカウント登録から薬の追加、服薬記録まで' },
            ].map(post => (
              <a
                key={post.href}
                href={post.href}
                className="block bg-white border rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{post.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1">{post.title}</h3>
                    <p className="text-xs text-gray-500">{post.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="text-center mt-4">
            <a href="/blog/" className="text-sm text-amber-500 hover:text-amber-600 transition">
              もっと読む →
            </a>
          </div>
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
          <a href="mailto:support@obatlog.com" className="hover:text-gray-600 transition">support@obatlog.com</a>
        </p>
        <p className="mb-2 text-gray-300">医療監修：現役薬剤師</p>
        © 2026 ObatLog
      </footer>
    </div>
  );
}
