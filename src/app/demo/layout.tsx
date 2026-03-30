import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'デモを試す',
  description:
    'ObatLogのデモモードを体験できます。登録不要で服薬記録・過量チェック・通知機能をお試しください。',
  alternates: { canonical: `${site}/demo/` },
  openGraph: {
    title: 'デモを試す | ObatLog',
    description:
      'ObatLogのデモモードを体験できます。登録不要で服薬記録・過量チェック・通知機能をお試しください。',
    url: `${site}/demo/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
