// 薬の追加・編集フォーム（通知設定UI含む）
import { useState } from 'react';
import { createMedication, updateMedication, type Medication } from '../api/medications';
import { t, getLang } from '../i18n/index';

interface Props {
  medication?: Medication;
  onSuccess: (med: Medication) => void;
  onCancel: () => void;
}

export default function MedicationForm({ medication, onSuccess, onCancel }: Props) {
  const lang = getLang();
  const [name, setName] = useState(medication?.name ?? '');
  const [limitPerDay, setLimitPerDay] = useState(medication?.limitPerDay ?? 1);
  const [notifyEnabled, setNotifyEnabled] = useState(medication?.notifyEnabled ?? false);
  const [notifyAt, setNotifyAt] = useState<string[]>(medication?.notifyAt ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = medication
        ? await updateMedication(medication.id, { name, limitPerDay, notifyEnabled, notifyAt })
        : await createMedication(name, limitPerDay);
      onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.internal', lang);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-white rounded-xl shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medications.name', lang)}
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medications.limitPerDay', lang)}
        </label>
        <input
          type="number"
          min={1}
          value={limitPerDay}
          onChange={e => setLimitPerDay(parseInt(e.target.value))}
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {/* 通知ON/OFFトグル */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{t('medications.notifyEnabled' as any, lang)}</label>
        <input type="checkbox" checked={notifyEnabled} onChange={e => setNotifyEnabled(e.target.checked)}
          className="rounded text-amber-400 focus:ring-amber-400" />
      </div>
      {/* 通知時刻セレクター */}
      {notifyEnabled && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('medications.notifyAt' as any, lang)}</label>
          {notifyAt.map((time, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={time} onChange={e => {
                const newAt = [...notifyAt];
                newAt[i] = e.target.value;
                setNotifyAt(newAt);
              }} className="border rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button type="button" onClick={() => setNotifyAt(prev => prev.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-amber-600 p-2">&#x2715;</button>
            </div>
          ))}
          {notifyAt.length < 5 && (
            <button type="button" onClick={() => setNotifyAt(prev => [...prev, '08:00'])}
              className="text-sm text-amber-500">{t('medications.addTime' as any, lang)}</button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? t('common.loading', lang) : t('common.save', lang)}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          {t('common.cancel', lang)}
        </button>
      </div>
    </form>
  );
}
