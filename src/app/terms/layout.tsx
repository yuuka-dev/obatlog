import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'Terms of Service | ObatLog',
  description:
    'Terms of Service for ObatLog, a personal medication log web app. Not a medical device.',
  alternates: { canonical: `${site}/terms/` },
  openGraph: {
    title: 'Terms of Service | ObatLog',
    description: 'Terms of Service for ObatLog.',
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
