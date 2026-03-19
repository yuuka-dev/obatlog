// 服薬記録 API クライアント
import { apiFetch } from '../lib/api';

export interface Intake {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  limitPerDaySnapshot: number;
  takenUnits: number;
  takenAt: { seconds: number };
  dateKey: string;
  isOverdose: boolean;
  totalToday: number;
}

export const listIntakesByDate = (dateKey: string) =>
  apiFetch<Intake[]>(`/v1/intakes?dateKey=${dateKey}`);

export const listRecentIntakes = (limit = 30) =>
  apiFetch<Intake[]>(`/v1/intakes?limit=${limit}`);

export const createIntake = (medicationId: string, takenUnits: number) =>
  apiFetch<{ intakeId: string; isOverdose: boolean; totalToday: number }>(
    '/v1/intakes',
    { method: 'POST', body: JSON.stringify({ medicationId, takenUnits }) }
  );
