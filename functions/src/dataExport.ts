// データエクスポート API — ユーザーの全データをJSON形式で返す
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const dataExportRouter = Router();
const db = () => admin.firestore();

// GET /v1/users/me/export — ユーザーデータを一括エクスポート
dataExportRouter.get('/me/export', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  try {
    // 全データを並列取得
    const [userDoc, medsSnap, intakesSnap] = await Promise.all([
      db().collection('users').doc(uid).get(),
      db().collection('medications').where('userId', '==', uid).get(),
      db().collection('intakes').where('userId', '==', uid).get(),
    ]);

    const user = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
    const medications = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const intakes = intakesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.json({ user, medications, intakes });
  } catch (err) {
    console.error('データエクスポートエラー:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'データのエクスポートに失敗しました。' },
    });
  }
});
