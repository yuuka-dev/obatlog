import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'ログイン',
  description:
    'ObatLogにログインして服薬記録を管理しましょう。メール・Googleアカウントで簡単にログインできます。',
  alternates: { canonical: `${site}/login/` },
  openGraph: {
    title: 'ログイン | ObatLog',
    description:
      'ObatLogにログインして服薬記録を管理しましょう。メール・Googleアカウントで簡単にログインできます。',
    url: `${site}/login/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
