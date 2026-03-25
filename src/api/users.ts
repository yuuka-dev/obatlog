// ユーザープロフィール API クライアント
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  language: 'ja' | 'en' | 'id';
  notificationToken?: string;
  notifyMethod?: 'push' | 'email';
  adFree: boolean;
  isDemo?: boolean;
  demoExpiresAt?: { _seconds: number; _nanoseconds: number };
  demoEmail?: string | null;
}

export const getMe = () => apiFetch<UserProfile>('/v1/users/me');

export const updateMe = (data: {
  language?: 'ja' | 'en' | 'id';
  notifyMethod?: 'push' | 'email';
  demoEmail?: string;
}) =>
  apiFetch<UserProfile>('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
