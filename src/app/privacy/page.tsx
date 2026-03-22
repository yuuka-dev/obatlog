'use client';

import Link from 'next/link';
import { t, getLang } from '@/i18n/index';
import LangSwitcher from '@/components/LangSwitcher';

export default function PrivacyPage() {
  const lang = getLang();

  const sections = [
    { title: 'legal.privacy.s1_title' as const, body: 'legal.privacy.s1_body' as const },
    { title: 'legal.privacy.s2_title' as const, body: 'legal.privacy.s2_body' as const },
    { title: 'legal.privacy.s3_title' as const, body: 'legal.privacy.s3_body' as const },
    { title: 'legal.privacy.s4_title' as const, body: 'legal.privacy.s4_body' as const },
    { title: 'legal.privacy.s5_title' as const, body: 'legal.privacy.s5_body' as const },
    { title: 'legal.privacy.s6_title' as const, body: 'legal.privacy.s6_body' as const },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <Link href="/" className="text-amber-500 hover:text-amber-600 text-sm order-2 sm:order-1">
            {t('legal.back', lang)}
          </Link>
          <div className="order-1 sm:order-2">
            <p className="text-xs text-gray-400 text-center sm:text-right mb-1">{t('lp.langLabel' as any, lang)}</p>
            <LangSwitcher current={lang} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-8">{t('legal.privacy.title', lang)}</h1>
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{t(s.title, lang)}</h2>
              <p className="whitespace-pre-line">{t(s.body, lang)}</p>
            </section>
          ))}
          <p className="text-gray-400 text-xs pt-4 border-t border-gray-200">{t('legal.privacy.updated', lang)}</p>
        </div>
      </div>
    </div>
  );
}
