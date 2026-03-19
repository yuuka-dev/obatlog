// 服薬ログ一覧（dateKey でグループ化）
import { useState, useEffect } from 'react';
import { listRecentIntakes, type Intake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LogList() {
  const lang = getLang();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        setIntakes(await listRecentIntakes(30));
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  if (intakes.length === 0) {
    return (
      <div className="pb-20 px-4 pt-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">{t('logs.title', lang)}</h1>
        <p className="text-center text-gray-400 py-8">{t('empty.logs.noIntakes', lang)}</p>
        <p className="text-center">
          <a href="/" className="text-amber-500 text-sm underline">ホームから記録する →</a>
        </p>
      </div>
    );
  }

  // dateKey でグループ化（新しい日付順）
  const grouped = intakes.reduce<Record<string, Intake[]>>((acc, intake) => {
    (acc[intake.dateKey] ??= []).push(intake);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(grouped).sort().reverse();

  return (
    <div className="pb-20 px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">{t('logs.title', lang)}</h1>
      {sortedDateKeys.map((dateKey) => (
        <div key={dateKey}>
          <p className="text-sm font-semibold text-gray-500 mb-2">{dateKey}</p>
          <div className="space-y-2">
            {grouped[dateKey].map(intake => (
              <div
                key={intake.id}
                className={`bg-white rounded-xl shadow p-3 flex justify-between items-center
                  ${intake.isOverdose ? 'border-l-4 border-amber-300' : ''}`}
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">{intake.medicationName}</p>
                  <p className="text-xs text-gray-400">
                    {intake.takenUnits} {t('home.units', lang)} — 累計 {intake.totalToday} / {intake.limitPerDaySnapshot}
                  </p>
                </div>
                {intake.isOverdose && (
                  <span className="text-amber-400 text-sm">💊</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
