// Functions API 呼び出し共通ラッパー
// - idToken を Authorization ヘッダーに自動付与
// - エラーレスポンスを統一的に変換
import { auth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Not logged in.');
  return user.getIdToken();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? 'Request failed.'
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
