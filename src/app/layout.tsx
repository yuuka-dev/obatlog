import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { getSiteUrl } from '@/lib/site';
import ServiceWorkerUpdateWatcher from '@/components/ServiceWorkerUpdateWatcher';

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(`${site}/`),
  title: {
    default: 'ObatLog｜お薬の飲み忘れ・飲みすぎを防ぐ服薬記録アプリ',
    template: '%s | ObatLog',
  },
  description:
    '毎日の服薬をワンタップで記録。過量服薬（OD）チェックと飲み忘れ通知で安心の服薬管理を。登録無料・スマホでサクッと使えるPWA対応アプリ。',
  applicationName: 'ObatLog',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: site,
    siteName: 'ObatLog',
    title: 'ObatLog｜お薬の飲み忘れ・飲みすぎを防ぐ服薬記録アプリ',
    description:
      '毎日の服薬をワンタップで記録。過量服薬チェックと飲み忘れ通知で安心の服薬管理を。登録無料・スマホでサクッと使えるアプリ。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ObatLog｜お薬の飲み忘れ・飲みすぎを防ぐ服薬記録アプリ',
    description:
      '毎日の服薬をワンタップで記録。過量服薬チェックと飲み忘れ通知で安心の服薬管理を。',
  },
  robots: { index: true, follow: true },
  other: {
    'google-adsense-account': 'ca-pub-9797235637202654',
  },
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
        <ServiceWorkerUpdateWatcher />
        {children}
      </body>
    </html>
  );
}
