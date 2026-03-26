// デモユーザー自動削除: 1時間おきに期限切れデモデータを削除
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

// バッチ削除ヘルパー（500件ずつ）
async function deleteCollection(collection: string, field: string, uid: string): Promise<number> {
  const snapshot = await db().collection(collection).where(field, '==', uid).get();
  if (snapshot.empty) return 0;

  let count = 0;
  let batch = db().batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db().batch();
    }
  }
  if (count % 500 !== 0) {
    await batch.commit();
  }
  return count;
}

// 期限切れデモユーザーを検索して全データを削除
async function cleanupExpiredDemoUsers(): Promise<void> {
  const now = admin.firestore.Timestamp.now();

  const expiredUsers = await db().collection('users')
    .where('isDemo', '==', true)
    .where('demoExpiresAt', '<', now)
    .get();

  if (expiredUsers.empty) {
    console.info('[cleanupDemoUsers] 期限切れデモユーザーなし');
    return;
  }

  console.info(`[cleanupDemoUsers] 削除対象: ${expiredUsers.size}件`);

  let deletedCount = 0;
  for (const userDoc of expiredUsers.docs) {
    const uid = userDoc.id;
    try {
      // 参照データを先に削除
      await Promise.all([
        deleteCollection('intakes', 'userId', uid),
        deleteCollection('dailyCounts', 'userId', uid),
        deleteCollection('errorLogs', 'uid', uid),
      ]);

      // 薬を削除
      await deleteCollection('medications', 'userId', uid);

      // ユーザードキュメント削除
      await db().collection('users').doc(uid).delete();

      // Firebase Auth アカウント削除
      await admin.auth().deleteUser(uid);

      deletedCount++;
      console.info(`[cleanupDemoUsers] 削除完了: ${uid}`);
    } catch (err) {
      // 部分失敗でも続行（次回実行で再試行）
      console.error(`[cleanupDemoUsers] 削除失敗: ${uid}`, err);
    }
  }

  console.info(`[cleanupDemoUsers] 完了: ${deletedCount}/${expiredUsers.size}件削除`);
}

export const cleanupDemoUsers = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  cleanupExpiredDemoUsers,
);
