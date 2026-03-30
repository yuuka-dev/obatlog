import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description:
    'ObatLogのプライバシーポリシーです。メールアドレス・服薬記録などの個人情報の取り扱いについてご説明します。',
  alternates: { canonical: `${site}/privacy/` },
  openGraph: {
    title: 'プライバシーポリシー | ObatLog',
    description:
      'ObatLogのプライバシーポリシーです。メールアドレス・服薬記録などの個人情報の取り扱いについてご説明します。',
    url: `${site}/privacy/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
