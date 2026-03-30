import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お薬一覧',
  description:
    '登録したお薬の一覧ページです。薬の追加・編集・1日の上限設定・通知設定を管理できます。',
  robots: { index: false, follow: false },
};

export default function MedicationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
