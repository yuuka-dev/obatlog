// FCM 通知トークン取得・登録
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase';
import { apiFetch } from './api';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// 通知許可を取得し、FCMトークンをサーバーに保存
export async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) {
    throw new Error('このブラウザは通知をサポートしていません');
  }

  // Push/Notification は通常 secure context(HTTPS) 必須
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('insecure-context');
  }

  if (!VAPID_KEY) {
    // VAPID 未設定だと getToken が失敗して通知が有効化できない
    throw new Error('no-vapid');
  }

  // すでに拒否済みだと再度プロンプトが出ない（ブラウザ挙動）
  if (Notification.permission === 'denied') {
    throw new Error('already-denied');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('denied');
  }

  // サービスワーカー登録
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  // users/{uid} が未作成でも落ちないように先に保証する
  await apiFetch('/v1/users/me');

  // トークンをサーバーに保存
  await apiFetch('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify({ notificationToken: token }),
  });
}
