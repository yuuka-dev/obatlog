import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(`${site}/`),
  title: { default: 'ObatLog — 服薬記録・過量チェック', template: '%s | ObatLog' },
  description:
    '毎日の服薬を記録し、1日の上限チェックで過量を防ぐシンプルなウェブアプリ（PWA）。医療機器ではありません。',
  applicationName: 'ObatLog',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: site,
    siteName: 'ObatLog',
    title: 'ObatLog — 服薬記録・過量チェック',
    description: '毎日の服薬を記録し、過量を防ぐシンプルなウェブアプリ。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ObatLog',
    description: '服薬記録・過量チェックアプリ',
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${site}/`,
    languages: {
      ja: `${site}/`,
      en: `${site}/`,
      id: `${site}/`,
      'x-default': `${site}/`,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
