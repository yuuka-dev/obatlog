// 薬リスト + 追加・編集・削除
import { useState, useEffect } from 'react';
import { listMedications, deleteMedication, type Medication } from '../api/medications';
import MedicationForm from './MedicationForm';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function MedicationList() {
  const lang = getLang();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Medication | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証確認後にデータ取得
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        setMeds(await listMedications());
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(t('medications.confirmDelete', lang))) return;
    await deleteMedication(id);
    setMeds(prev => prev.filter(m => m.id !== id));
  }

  function handleSuccess(med: Medication) {
    setMeds(prev => {
      const exists = prev.find(m => m.id === med.id);
      return exists ? prev.map(m => m.id === med.id ? med : m) : [...prev, med];
    });
    setShowForm(false);
    setEditTarget(undefined);
  }

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  return (
    <div className="pb-20 px-4 pt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{t('medications.title', lang)}</h1>
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="bg-amber-400 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
          + {t('common.add', lang)}
        </button>
      </div>

      {showForm && (
        <MedicationForm
          medication={editTarget}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditTarget(undefined); }}
        />
      )}

      {meds.length === 0 && !showForm ? (
        <p className="text-center text-gray-400 py-8">{t('empty.medications.noMedications', lang)}</p>
      ) : (
        meds.map(med => (
          <div key={med.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{med.name}</p>
              <p className="text-sm text-gray-400">{t('medications.limitPerDay', lang)}: {med.limitPerDay}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditTarget(med); setShowForm(true); }}
                className="text-sm text-amber-500 hover:text-amber-700">
                {t('common.edit', lang)}
              </button>
              <button onClick={() => handleDelete(med.id)}
                className="text-sm text-gray-400 hover:text-amber-600">
                {t('common.delete', lang)}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
