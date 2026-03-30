import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '設定',
  description:
    'ObatLogの設定ページです。通知設定・アカウント管理・データエクスポートなどを行えます。',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
