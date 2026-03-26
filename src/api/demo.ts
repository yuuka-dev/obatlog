// デモ機能 API クライアント
import { apiFetch } from '../lib/api';

export const setupDemo = () =>
  apiFetch<void>('/v1/demo/setup', { method: 'POST' });
