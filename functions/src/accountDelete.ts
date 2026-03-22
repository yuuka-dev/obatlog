// アカウント削除 API — 全ユーザーデータを削除
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const accountDeleteRouter = Router();
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

// DELETE /v1/users/me — アカウントと全データを削除
accountDeleteRouter.delete('/me', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  try {
    // Firestoreの全ユーザーデータを削除
    await Promise.all([
      deleteCollection('medications', 'userId', uid),
      deleteCollection('intakes', 'userId', uid),
      deleteCollection('dailyCounts', 'userId', uid),
      deleteCollection('errorLogs', 'uid', uid),
    ]);

    // ユーザードキュメント削除
    await db().collection('users').doc(uid).delete();

    // Firebase Auth ユーザー削除
    await admin.auth().deleteUser(uid);

    return res.json({ message: 'アカウントを削除しました' });
  } catch (err) {
    console.error('アカウント削除エラー:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'アカウントの削除に失敗しました。' },
    });
  }
});
