import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'Privacy Policy | ObatLog',
  description:
    'Privacy Policy for ObatLog. How we handle email, medication records, and Firebase.',
  alternates: { canonical: `${site}/privacy/` },
  openGraph: {
    title: 'Privacy Policy | ObatLog',
    description: 'Privacy Policy for ObatLog.',
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
