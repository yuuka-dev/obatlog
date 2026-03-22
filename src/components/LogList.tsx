// 服薬ログ一覧（dateKey でグループ化、OD記録区別表示）
import { useState, useEffect } from 'react';
import { listRecentIntakes, type Intake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LogList() {
  const lang = getLang();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        setIntakes(await listRecentIntakes(30));
      } catch {
        setFetchError(t('toast.error' as any, lang));
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  if (intakes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">{t('logs.title', lang)}</h1>
        {fetchError && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{fetchError}</p>}
        <p className="text-center text-gray-400 py-8">{t('empty.logs.noIntakes', lang)}</p>
        <p className="text-center">
          <a href="/" className="text-amber-500 text-sm underline">{t('empty.logs.goHome' as any, lang)}</a>
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">{t('logs.title', lang)}</h1>
      {fetchError && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{fetchError}</p>}
      {sortedDateKeys.map((dateKey) => (
        <div key={dateKey}>
          <p className="text-sm font-semibold text-gray-500 mb-2">{dateKey}</p>
          <div className="space-y-2">
            {grouped[dateKey].map(intake => (
              <div
                key={intake.id}
                className={`bg-white rounded-xl shadow p-3 flex justify-between items-center
                  ${intake.isOdLog ? 'border-l-4 border-purple-200' : intake.isOverdose ? 'border-l-4 border-amber-300' : ''}`}
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">{intake.medicationName}</p>
                  <p className="text-xs text-gray-400">
                    {intake.takenUnits} {t('home.units', lang)} — {t('logs.total' as any, lang)} {intake.totalToday} / {intake.limitPerDaySnapshot}
                  </p>
                  {/* OD記録の詳細表示 */}
                  {intake.isOdLog && (
                    <div className="mt-1">
                      <span className="text-xs text-purple-400 mr-2">{t('logs.odLabel' as any, lang)}</span>
                      {intake.moodTags?.map((tag, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-500 rounded-full px-2 py-0.5 mr-1">{tag}</span>
                      ))}
                      {intake.memo && <p className="text-xs text-gray-400 mt-1">{intake.memo}</p>}
                    </div>
                  )}
                </div>
                {intake.isOverdose && (
                  <span className="text-amber-400 text-sm">&#x1F48A;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
