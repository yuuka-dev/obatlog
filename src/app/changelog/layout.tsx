import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: '更新履歴',
  description:
    'ObatLogの更新履歴・リリースノートです。新機能や改善内容をバージョンごとにご確認いただけます。',
  alternates: { canonical: `${site}/changelog/` },
  openGraph: {
    title: '更新履歴 | ObatLog',
    description:
      'ObatLogの更新履歴・リリースノートです。新機能や改善内容をバージョンごとにご確認いただけます。',
    url: `${site}/changelog/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
