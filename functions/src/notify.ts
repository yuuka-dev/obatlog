// FCM / メール通知: 毎時実行し、該当時刻の薬リマインダーを送信
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getTokyoReminderSlot } from './reminderSlot';
import { sendEmail } from './mailSender';
import { buildReminderHtml } from './mailTemplate';

const db = () => admin.firestore();

export const sendMedicationReminders = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    secrets: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
  },
  async () => {
    const now = new Date();
    const { timeSlot, dateKey } = getTokyoReminderSlot(now);

    // 通知対象の薬を取得
    const medsSnap = await db().collection('medications')
      .where('notifyEnabled', '==', true)
      .where('notifyAt', 'array-contains', timeSlot)
      .get();

    console.info('[sendMedicationReminders] tick', { timeSlot, dateKey, matchedMeds: medsSnap.size });
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
    let totalSent = 0;
    for (const [userId, meds] of userMeds) {
      try {
        const userSnap = await db().collection('users').doc(userId).get();
        const userData = userSnap.data();
        // notifyMethod 未設定は 'push' として扱う（既存ユーザー後方互換）
        const notifyMethod: string = userData?.notifyMethod ?? 'push';

        // 上限チェック: 上限に達した薬を除外
        const activeMeds: Array<{ name: string }> = [];
        for (const med of meds) {
          const counterRef = db().collection('dailyCounts').doc(`${userId}_${med.medicationId}_${dateKey}`);
          const counterSnap = await counterRef.get();
          const currentTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
          if (currentTotal < med.limitPerDay) {
            activeMeds.push(med);
          }
        }

        if (activeMeds.length === 0) continue;

        if (notifyMethod === 'email') {
          // メール通知: デモユーザーは demoEmail を優先使用
          let email: string | undefined;
          if (userData?.isDemo === true) {
            email = userData.demoEmail || undefined;
          } else {
            try {
              const authUser = await admin.auth().getUser(userId);
              email = authUser.email;
            } catch {
              console.warn(`[sendMedicationReminders] auth.getUser failed for ${userId}`);
            }
          }
          if (!email) {
            console.info('[sendMedicationReminders] skip email (no address)', { userId });
            continue;
          }

          const html = buildReminderHtml(activeMeds.map(m => m.name));
          await sendEmail(email, 'ObatLog リマインダー', html);
          totalSent++;
        } else {
          // FCM プッシュ通知（既存ロジック）
          const token = userData?.notificationToken;
          if (!token) {
            console.info('[sendMedicationReminders] skip (no token)', { userId, timeSlot, medsCount: meds.length });
            continue;
          }

          let userSent = 0;
          let userSendErrors = 0;
          for (const med of activeMeds) {
            try {
              await admin.messaging().send({
                token,
                notification: { title: 'ObatLog', body: `${med.name} の時間だよ` },
                webpush: { fcmOptions: { link: '/' } },
              });
              userSent++;
              totalSent++;
            } catch (err) {
              console.error(`FCM send error for user ${userId}:`, err);
              userSendErrors++;
            }
          }

          console.info('[sendMedicationReminders] user result', {
            userId, timeSlot, medsCount: meds.length,
            activeMeds: activeMeds.length, userSent, userSendErrors,
          });
        }
      } catch (err) {
        // 1ユーザーの失敗が他に影響しない
        console.error(`[sendMedicationReminders] error for user ${userId}:`, err);
      }
    }

    console.info('[sendMedicationReminders] total result', { timeSlot, dateKey, totalSent });
  }
);
