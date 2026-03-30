import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: '利用規約',
  description:
    'ObatLogの利用規約です。サービスのご利用条件・免責事項についてご確認ください。',
  alternates: { canonical: `${site}/terms/` },
  openGraph: {
    title: '利用規約 | ObatLog',
    description:
      'ObatLogの利用規約です。サービスのご利用条件・免責事項についてご確認ください。',
    url: `${site}/terms/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
