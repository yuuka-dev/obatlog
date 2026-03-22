// レスポンシブレイアウト共通化（モバイル: 下部タブ / PC: サイドナビ）
import React, { useState, useEffect, type ReactNode } from 'react';
import TabNav from './TabNav';
import SideNav from './SideNav';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listMedications } from '../api/medications';
import { listIntakesByDate } from '../api/intakes';

interface AppLayoutProps {
  active: 'home' | 'medications' | 'logs';
  children: ReactNode;
}

export default function AppLayout({ active, children }: AppLayoutProps) {
  const [isPC, setIsPC] = useState(false);
  const [medSummaries, setMedSummaries] = useState<Array<{
    id: string; name: string; limitPerDay: number; todayTotal: number;
  }>>([]);

  // matchMedia でレスポンシブ検知
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsPC(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // PC表示時のみサイドバーのサマリーデータを取得
  useEffect(() => {
    if (!isPC) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const dateKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
        const [meds, intakes] = await Promise.all([
          listMedications(),
          listIntakesByDate(dateKey),
        ]);
        const summaries = meds.map(med => {
          const total = intakes
            .filter(i => i.medicationId === med.id)
            .reduce((sum, i) => sum + i.takenUnits, 0);
          return { id: med.id, name: med.name, limitPerDay: med.limitPerDay, todayTotal: total };
        });
        setMedSummaries(summaries);
      } catch { /* サイドバーのエラーは無視 */ }
    });
    return () => unsub();
  }, [isPC]);

  return (
    <div className="min-h-screen bg-gray-50">
      {isPC && <SideNav active={active} medSummaries={medSummaries} />}
      <main className={`${isPC ? 'ml-56' : ''} pb-20 md:pb-4`}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {children}
        </div>
      </main>
      {!isPC && <TabNav active={active} />}
    </div>
  );
}
