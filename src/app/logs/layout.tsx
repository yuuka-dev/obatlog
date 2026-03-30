import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服薬ログ',
  description:
    '過去の服薬記録を確認できます。日付ごとにグルーピングされた服薬履歴を振り返りましょう。',
  robots: { index: false, follow: false },
};

export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
