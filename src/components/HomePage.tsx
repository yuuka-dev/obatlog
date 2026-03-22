// ホームページ: 認証状態でLP/ホームを切り替え
import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './LandingPage';
import AppLayout from './AppLayout';
import IntakeForm from './IntakeForm';

export default function HomePage() {
  const [user, setUser] = useState<unknown>(undefined); // undefined = loading, null = 未認証

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
    });
    return () => unsub();
  }, []);

  // ローディング中
  if (user === undefined) return null;

  // 未認証: LP表示
  if (user === null) return <LandingPage />;

  // 認証済み: AppLayout + IntakeForm
  return (
    <AppLayout active="home">
      <IntakeForm />
    </AppLayout>
  );
}
