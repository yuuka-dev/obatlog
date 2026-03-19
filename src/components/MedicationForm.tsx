// 薬の追加・編集フォーム
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = medication
        ? await updateMedication(medication.id, { name, limitPerDay })
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
