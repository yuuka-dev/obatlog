// 服薬記録 API + 過量チェックロジック
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const intakesRouter = Router();
const db = admin.firestore();

// calcOverdose: 過量チェック純粋関数（テスト可能）
// previousTotal: 今回の記録を除く当日・同薬の累計
// takenUnits: 今回飲む錠数
// limitPerDay: 1日上限
export function calcOverdose(
  previousTotal: number,
  takenUnits: number,
  limitPerDay: number
): { isOverdose: boolean; totalToday: number } {
  const totalToday = previousTotal + takenUnits;
  return { isOverdose: totalToday > limitPerDay, totalToday };
}

// POST /v1/intakes — 服薬記録（過量チェック含む・超過でも必ず保存）
intakesRouter.post('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { medicationId, takenUnits } = req.body;

  if (!medicationId || typeof medicationId !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'medicationId is required.' } });
  }
  if (!Number.isInteger(takenUnits) || takenUnits <= 0) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits must be a positive integer.' } });
  }

  try {
    // 薬情報取得
    const medDoc = await db.collection('medications').doc(medicationId).get();
    if (!medDoc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
    if (medDoc.data()?.userId !== uid) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    const { name: medicationName, limitPerDay } = medDoc.data()!;

    // サーバー時刻で dateKey を生成（Asia/Tokyo）
    const now = new Date();
    const dateKey = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // "2026-03-17"

    // 当日・同薬の既存累計を計算
    const todaySnap = await db.collection('intakes')
      .where('userId', '==', uid)
      .where('medicationId', '==', medicationId)
      .where('dateKey', '==', dateKey)
      .get();
    const previousTotal = todaySnap.docs.reduce((sum, d) => sum + (d.data().takenUnits ?? 0), 0);

    // 過量チェック（超過でも保存する）
    const { isOverdose, totalToday } = calcOverdose(previousTotal, takenUnits, limitPerDay);

    // Firestore に保存
    const ref = await db.collection('intakes').add({
      userId: uid,
      medicationId,
      medicationName,
      limitPerDaySnapshot: limitPerDay,
      takenUnits,
      takenAt: admin.firestore.FieldValue.serverTimestamp(),
      dateKey,
      isOverdose,
      totalToday,
    });

    return res.status(201).json({ intakeId: ref.id, isOverdose, totalToday });
  } catch (e) {
    console.error('intakes POST error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record intake.' } });
  }
});

// GET /v1/intakes — 服薬記録取得
// クエリパラメータ: dateKey=YYYY-MM-DD (特定日) or limit=N (直近N件, デフォルト30)
intakesRouter.get('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { dateKey, limit } = req.query;

  try {
    let query: admin.firestore.Query = db.collection('intakes').where('userId', '==', uid);

    if (dateKey) {
      // 特定日フィルタ（ホーム画面用）
      query = query.where('dateKey', '==', dateKey as string).orderBy('takenAt', 'asc');
      const snap = await query.get();
      return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } else {
      // 直近N件（ログ一覧用）
      const n = Math.min(parseInt(limit as string) || 30, 100);
      const snap = await query.orderBy('takenAt', 'desc').limit(n).get();
      return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
  } catch (e) {
    console.error('intakes GET error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list intakes.' } });
  }
});
