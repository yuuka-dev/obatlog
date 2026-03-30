// 服薬記録フォーム（過量警告UI含む）
import { useState, useEffect } from 'react';
import { listMedications, type Medication } from '../api/medications';
import { listIntakesByDate, createIntake, cancelIntake, type Intake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Stepper from './Stepper';
import ProgressBar from './ProgressBar';
import ToastComponent, { type ToastItem } from './Toast';
import OdLogForm from './OdLogForm';

// 今日の dateKey を Asia/Tokyo で取得
function getTodayKey(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export default function IntakeForm() {
  const lang = getLang();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<Intake[]>([]);
  const [units, setUnits] = useState<Record<string, number>>({});
  const [todayTotals, setTodayTotals] = useState<Record<string, number>>({});
  const [overdoseMsg, setOverdoseMsg] = useState('');
  const [takeError, setTakeError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showOdForm, setShowOdForm] = useState(false);

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
        // 累計を計算
        const totals: Record<string, number> = {};
        for (const intake of intakesData) {
          // 同日・同薬で複数行あるときは orderBy(takenAt asc) の最後が最新累計
          totals[intake.medicationId] = intake.totalToday ?? 0;
        }
        setTodayTotals(totals);
      } catch {
        setFetchError(t('home.fetchError' as any, lang));
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleTake(med: Medication) {
    if (submitting[med.id]) return;
    setSubmitting(prev => ({ ...prev, [med.id]: true }));
    setOverdoseMsg(''); // B-2 修正: 前回の警告をクリア
    setTakeError('');
    const takenUnits = units[med.id] ?? 1;
    try {
      const result = await createIntake(med.id, takenUnits);
      // state更新
      const newIntake: Intake = {
        id: result.intakeId,
        userId: '',
        medicationId: med.id,
        medicationName: med.name,
        limitPerDaySnapshot: med.limitPerDay,
        takenUnits,
        takenAt: { seconds: Date.now() / 1000 },
        dateKey: result.dateKey,
        isOverdose: result.isOverdose,
        totalToday: result.totalToday,
        cancelled: false,
        isOdLog: false,
        moodTags: [],
        memo: '',
      };
      setTodayIntakes(prev => [...prev, newIntake]);
      setTodayTotals(prev => ({ ...prev, [med.id]: result.totalToday }));

      // Toast表示
      const toastId = result.intakeId;
      setToasts(prev => [...prev, {
        id: toastId,
        message: t('toast.recorded' as any, lang).replace('{name}', med.name),
        undoLabel: t('toast.undo' as any, lang),
        onUndo: async () => {
          try {
            await cancelIntake(toastId);
            setTodayIntakes(prev => prev.filter(i => i.id !== toastId));
            // 取り消し後に todayTotals を再計算
            setTodayTotals(prev => ({
              ...prev,
              [med.id]: Math.max(0, (prev[med.id] ?? 0) - takenUnits),
            }));
            setToasts(prev => prev.filter(t => t.id !== toastId));
          } catch {
            setTakeError(t('toast.error' as any, lang));
          }
        },
      }]);

      if (result.isOverdose) {
        setOverdoseMsg(t('overdose.message', lang));
      }
    } catch {
      setTakeError(t('toast.error' as any, lang));
    } finally {
      setSubmitting(prev => ({ ...prev, [med.id]: false }));
    }
  }

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  const allComplete = meds.length > 0 && meds.every(m => (todayTotals[m.id] ?? 0) >= m.limitPerDay);

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <h1 className="text-xl font-bold text-gray-800">{t('home.title', lang)}</h1>
      <p className="text-sm text-gray-400">{getTodayKey()}</p>

      {/* データ取得エラー */}
      {fetchError && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{fetchError}</p>
      )}

      {/* 操作エラー */}
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

      {/* 全薬完了表示 */}
      {allComplete && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">{t('home.allComplete' as any, lang)}</p>
        </div>
      )}

      {meds.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-400">{t('empty.home.noMedications', lang)}</p>
          <a href="/medications/" className="text-amber-500 text-sm underline">
            {t('nav.medications', lang)} →
          </a>
        </div>
      ) : (
        meds.map(med => (
          <div key={med.id} className="bg-white rounded-xl shadow p-4 space-y-3">
            <p className="font-medium text-gray-800">{med.name}</p>
            <ProgressBar
              current={todayTotals[med.id] ?? 0}
              max={med.limitPerDay}
              unit={t('home.units', lang)}
            />
            <div className="flex items-center gap-2">
              <Stepper
                value={units[med.id] ?? 1}
                onChange={v => setUnits(prev => ({ ...prev, [med.id]: v }))}
                min={1}
                max={med.limitPerDay}
                unit={t('home.units', lang)}
              />
              <button
                onClick={() => handleTake(med)}
                disabled={submitting[med.id]}
                className="ml-auto bg-amber-400 hover:bg-amber-500 text-white px-5 py-3 rounded-lg text-base font-medium disabled:opacity-50"
              >
                {submitting[med.id] ? '...' : t('home.take', lang)}
              </button>
            </div>
          </div>
        ))
      )}

      {meds.length > 0 && todayIntakes.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">{t('empty.home.noIntakesToday', lang)}</p>
      )}

      {/* OD記録ボタン + フォーム */}
      {meds.length > 0 && !showOdForm && (
        <button onClick={() => setShowOdForm(true)}
          className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl text-sm">
          {t('od.button' as any, lang)}
        </button>
      )}
      {showOdForm && (
        <OdLogForm
          medications={meds}
          onSuccess={(result) => {
            setShowOdForm(false);
            setToasts(prev => [...prev, {
              id: result.intakeId,
              message: t('od.successMessage' as any, lang),
            }]);
          }}
          onCancel={() => setShowOdForm(false)}
        />
      )}

      {/* Toast通知 */}
      <ToastComponent items={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
