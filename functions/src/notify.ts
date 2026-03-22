// FCM通知: 毎時実行し、該当時刻の薬リマインダーを送信
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

export const sendMedicationReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
  async () => {
    const now = new Date();
    const currentHour = now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false });
    const timeSlot = `${currentHour.padStart(2, '0')}:00`;
    const dateKey = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

    // 通知対象の薬を取得
    const medsSnap = await db().collection('medications')
      .where('notifyEnabled', '==', true)
      .where('notifyAt', 'array-contains', timeSlot)
      .get();

    if (medsSnap.empty) return;

    // ユーザーごとにグループ化
    const userMeds = new Map<string, Array<{ name: string; medicationId: string; limitPerDay: number }>>();
    for (const doc of medsSnap.docs) {
      const data = doc.data();
      const list = userMeds.get(data.userId) ?? [];
      list.push({ name: data.name, medicationId: doc.id, limitPerDay: data.limitPerDay });
      userMeds.set(data.userId, list);
    }

    // 各ユーザーに通知送信
    for (const [userId, meds] of userMeds) {
      const userSnap = await db().collection('users').doc(userId).get();
      const token = userSnap.data()?.notificationToken;
      if (!token) continue;

      for (const med of meds) {
        // dailyCounts で上限チェック
        const counterRef = db().collection('dailyCounts').doc(`${userId}_${med.medicationId}_${dateKey}`);
        const counterSnap = await counterRef.get();
        const currentTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
        if (currentTotal >= med.limitPerDay) continue;

        try {
          await admin.messaging().send({
            token,
            notification: { title: 'ObatLog', body: `${med.name} の時間だよ` },
            webpush: { fcmOptions: { link: '/' } },
          });
        } catch (err) {
          console.error(`FCM send error for user ${userId}:`, err);
        }
      }
    }
  }
);
