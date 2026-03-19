// OD（過量服薬）記録フォーム
import React, { useState } from 'react';
import Stepper from './Stepper';
import { createIntake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import type { Medication } from '../api/medications';

interface OdLogFormProps {
  medications: Medication[];
  onSuccess: (result: { intakeId: string; dateKey: string }) => void;
  onCancel: () => void;
}

const MOOD_TAG_KEYS = [
  'struggling', 'anxious', 'cantSleep', 'impulsive', 'irritated', 'dontRemember',
] as const;

export default function OdLogForm({ medications, onSuccess, onCancel }: OdLogFormProps) {
  const lang = getLang();
  const [medId, setMedId] = useState(medications[0]?.id ?? '');
  const [units, setUnits] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  };

  const handleSubmit = async () => {
    if (!medId || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await createIntake(medId, units, {
        isOdLog: true,
        moodTags: tags.map(k => t(`moodTags.${k}` as any, lang)),
        memo,
      });
      onSuccess({ intakeId: result.intakeId, dateKey: result.dateKey });
    } catch {
      setError(t('toast.error' as any, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
      <p className="font-medium text-gray-700">{t('od.title' as any, lang)}</p>

      <select value={medId} onChange={e => setMedId(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <Stepper value={units} onChange={setUnits} min={1} unit={t('od.units' as any, lang)} />

      <div>
        <p className="text-sm text-gray-500 mb-2">{t('od.moodLabel' as any, lang)}</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAG_KEYS.map(key => (
            <button key={key} type="button" onClick={() => toggleTag(key)}
              className={`px-3 py-1.5 rounded-full text-sm
                ${tags.includes(key) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {t(`moodTags.${key}` as any, lang)}
            </button>
          ))}
        </div>
      </div>

      <textarea value={memo} onChange={e => setMemo(e.target.value)}
        placeholder={t('od.memoLabel' as any, lang)} maxLength={500}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />

      {error && <p className="text-amber-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 bg-amber-400 text-white py-3 rounded-lg font-medium disabled:opacity-50">
          {loading ? '...' : t('od.submit' as any, lang)}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-lg font-medium">
          {t('od.cancel' as any, lang)}
        </button>
      </div>
    </div>
  );
}
