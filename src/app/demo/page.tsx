'use client';
// デモセットアップページ: 匿名認証 → データ投入 → リダイレクト
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { signInAnonymously } from '@/lib/auth';
import { setupDemo } from '@/api/demo';
import { getLang, t } from '@/i18n/index';

export default function DemoPage() {
  const lang = getLang();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      // 既に認証済み（通常ユーザー）ならホームへ
      if (user && !user.isAnonymous) {
        router.push('/');
        return;
      }

      try {
        // 匿名認証
        if (!user) {
          await signInAnonymously();
          // onAuthStateChanged が再発火するので、ここでは何もしない
          return;
        }

        // 匿名ユーザーでログイン済み → デモデータ投入
        await setupDemo();
        if (!cancelled) router.push('/');
      } catch {
        if (!cancelled) setError(t('demo.setupError' as any, lang));
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router, lang]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-4">{error}</p>
            <a
              href="/"
              className="inline-block text-sm text-amber-500 hover:text-amber-600 transition"
            >
              {t('demo.backToHome' as any, lang)}
            </a>
          </>
        ) : (
          <>
            {/* ローディングスピナー */}
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">{t('demo.settingUp' as any, lang)}</p>
          </>
        )}
      </div>
    </div>
  );
}
