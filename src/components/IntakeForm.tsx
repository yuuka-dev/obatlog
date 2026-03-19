// 服薬記録フォーム（過量警告UI含む）
import { useState, useEffect } from 'react';
import { listMedications, type Medication } from '../api/medications';
import { listIntakesByDate, createIntake, type Intake } from '../api/intakes';
import { t, getLang, setLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 今日の dateKey を Asia/Tokyo で取得
function getTodayKey(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export default function IntakeForm() {
  const [lang, setLangState] = useState<'ja' | 'en' | 'id'>(getLang());
  const [meds, setMeds] = useState<Medication[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<Intake[]>([]);
  const [units, setUnits] = useState<Record<string, number>>({});
  const [overdoseMsg, setOverdoseMsg] = useState('');
  const [takeError, setTakeError] = useState('');
  const [loading, setLoading] = useState(true);

  function handleLangChange(newLang: 'ja' | 'en' | 'id') {
    setLang(newLang);
    setLangState(newLang);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        const [medsData, intakesData] = await Promise.all([
          listMedications(),
          listIntakesByDate(getTodayKey()),
        ]);
        setMeds(medsData);
        setTodayIntakes(intakesData);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleTake(med: Medication) {
    setTakeError('');
    const takenUnits = units[med.id] ?? 1;
    try {
      const result = await createIntake(med.id, takenUnits);
      if (result.isOverdose) setOverdoseMsg(t('overdose.message', lang));
      setTodayIntakes(prev => [...prev, {
        id: result.intakeId,
        userId: '',
        medicationId: med.id,
        medicationName: med.name,
        limitPerDaySnapshot: med.limitPerDay,
        takenUnits,
        takenAt: { seconds: Date.now() / 1000 },
        dateKey: getTodayKey(),
        isOverdose: result.isOverdose,
        totalToday: result.totalToday,
      }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.internal', lang);
      setTakeError(msg);
    }
  }

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  // 今日の累計を薬IDごとに集計（最新のtotalTodayを使う）
  const todayTotals: Record<string, number> = {};
  for (const intake of todayIntakes) {
    todayTotals[intake.medicationId] = intake.totalToday;
  }

  return (
    <div className="pb-20 px-4 pt-4 space-y-3">
      {/* ヘッダー: タイトル + 言語切替 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{t('home.title', lang)}</h1>
        <div className="flex gap-1">
          {(['ja', 'en', 'id'] as const).map(l => (
            <button key={l} onClick={() => handleLangChange(l)}
              className={`text-xs px-2 py-1 rounded-lg transition
                ${lang === l ? 'bg-amber-400 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-400">{getTodayKey()}</p>

      {/* エラー表示（アンバー系） */}
      {takeError && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{takeError}</p>
      )}

      {/* 過量警告（やわらかいアンバー色） */}
      {overdoseMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">💊</span>
          <p className="text-amber-800 text-sm">{overdoseMsg}</p>
        </div>
      )}

      {meds.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-400">{t('empty.home.noMedications', lang)}</p>
          <a href="/medications" className="text-amber-500 text-sm underline">
            {t('nav.medications', lang)} →
          </a>
        </div>
      ) : (
        meds.map(med => (
          <div key={med.id} className="bg-white rounded-xl shadow p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-medium text-gray-800">{med.name}</p>
              <p className="text-xs text-gray-400">
                {todayTotals[med.id] ?? 0} / {med.limitPerDay} {t('home.units', lang)}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={units[med.id] ?? 1}
                onChange={e => setUnits(prev => ({ ...prev, [med.id]: parseInt(e.target.value) }))}
                className="w-16 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-sm text-gray-500">{t('home.units', lang)}</span>
              <button
                onClick={() => handleTake(med)}
                className="ml-auto bg-amber-400 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
              >
                {t('home.take', lang)}
              </button>
            </div>
          </div>
        ))
      )}

      {meds.length > 0 && todayIntakes.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">{t('empty.home.noIntakesToday', lang)}</p>
      )}
    </div>
  );
}
