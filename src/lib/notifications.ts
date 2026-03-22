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

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('通知が許可されませんでした');
  }

  // サービスワーカー登録
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  // トークンをサーバーに保存
  await apiFetch('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify({ notificationToken: token }),
  });
}
