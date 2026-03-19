// 薬 CRUD API クライアント
import { apiFetch } from '../lib/api';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  limitPerDay: number;
}

export const listMedications = () =>
  apiFetch<Medication[]>('/v1/medications');

export const createMedication = (name: string, limitPerDay: number) =>
  apiFetch<Medication>('/v1/medications', {
    method: 'POST',
    body: JSON.stringify({ name, limitPerDay }),
  });

export const updateMedication = (id: string, data: Partial<Pick<Medication, 'name' | 'limitPerDay'>>) =>
  apiFetch<Medication>(`/v1/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMedication = (id: string) =>
  apiFetch<void>(`/v1/medications/${id}`, { method: 'DELETE' });
