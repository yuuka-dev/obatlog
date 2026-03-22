// ユーザープロフィール API クライアント
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  language: 'ja' | 'en' | 'id';
  notificationToken?: string;
  adFree: boolean;
}

export const getMe = () => apiFetch<UserProfile>('/v1/users/me');

export const updateMe = (language: 'ja' | 'en' | 'id') =>
  apiFetch<UserProfile>('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify({ language }),
  });
