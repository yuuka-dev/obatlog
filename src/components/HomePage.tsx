// ホームページ: 認証状態でLP/ホームを切り替え
// SSG時はLandingPageをレンダリングし、クローラーにコンテンツが見えるようにする。
// クライアント側で認証状態が確定したらアプリUIに切り替え。
import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './LandingPage';
import AppLayout from './AppLayout';
import IntakeForm from './IntakeForm';

export default function HomePage() {
  const [user, setUser] = useState<unknown>(null); // SSG時はnull → LP表示
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // 認証済み: AppLayout + IntakeForm
  if (authChecked && user) {
    return (
      <AppLayout active="home">
        <IntakeForm />
      </AppLayout>
    );
  }

  // SSG + 未認証 + 認証チェック中: LP表示
  return <LandingPage />;
}
