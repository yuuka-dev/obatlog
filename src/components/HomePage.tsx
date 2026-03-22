// ホームページ: 認証状態でLP/ホームを切り替え
import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './LandingPage';
import AppLayout from './AppLayout';
import IntakeForm from './IntakeForm';
import { t, getLang } from '../i18n/index';

export default function HomePage() {
  const [user, setUser] = useState<unknown>(undefined); // undefined = loading, null = 未認証

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
    });
    return () => unsub();
  }, []);

  // ローディング中（null だと真っ白で「壊れた」ように見える）
  if (user === undefined) {
    return (
      <p className="text-center py-16 text-gray-400">{t('common.loading', getLang())}</p>
    );
  }

  // 未認証: LP表示
  if (user === null) return <LandingPage />;

  // 認証済み: AppLayout + IntakeForm
  return (
    <AppLayout active="home">
      <IntakeForm />
    </AppLayout>
  );
}
