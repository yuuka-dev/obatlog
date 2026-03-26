// デモユーザー用初期データ投入 API
import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';

export const demoRouter = Router();
const db = () => admin.firestore();

// デモ用薬データ
const DEMO_MEDICATIONS = [
  { name: 'レキサルティ（1mg）', limitPerDay: 2, notifyEnabled: true, notifyAt: ['08:00'] },
  { name: 'デパス（0.5mg）', limitPerDay: 3, notifyEnabled: true, notifyAt: ['08:00', '20:00'] },
  { name: 'ルネスタ（2mg）', limitPerDay: 1, notifyEnabled: true, notifyAt: ['22:00'] },
];

// ブラウザ言語からサポート言語を判定
function resolveLanguage(acceptLanguage: string | undefined): string {
  if (!acceptLanguage) return 'en';
  const primary = acceptLanguage.split(',')[0].trim().toLowerCase();
  if (primary.startsWith('ja')) return 'ja';
  if (primary.startsWith('id')) return 'id';
  return 'en';
}

// 東京タイムゾーンの dateKey を取得
function getDateKey(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

// POST /v1/demo/setup — デモ用初期データ投入
demoRouter.post('/setup', async (req: Request, res: Response) => {
  // Authorization ヘッダーから idToken を取得・検証
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authorization header required.' } });
  }

  let decodedToken: admin.auth.DecodedIdToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' } });
  }

  // 匿名認証チェック
  if (decodedToken.firebase.sign_in_provider !== 'anonymous') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only anonymous users can setup demo.' } });
  }

  const uid = decodedToken.uid;

  // 二重セットアップ防止: 既にデモユーザーが存在する場合は 409
  const existingUser = await db().collection('users').doc(uid).get();
  if (existingUser.exists && existingUser.data()?.isDemo === true) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Demo already set up.' } });
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const language = resolveLanguage(req.headers['accept-language']);

    // ユーザードキュメント作成
    await db().collection('users').doc(uid).set({
      email: '',
      language,
      notificationToken: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      adFree: false,
      notifyMethod: 'email',
      isDemo: true,
      demoExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      demoEmail: null,
    }, { merge: true });

    // 薬の登録
    const medRefs: Array<{ id: string; name: string; limitPerDay: number }> = [];
    for (const med of DEMO_MEDICATIONS) {
      const ref = db().collection('medications').doc();
      await ref.set({
        userId: uid,
        name: med.name,
        limitPerDay: med.limitPerDay,
        notifyEnabled: med.notifyEnabled,
        notifyAt: med.notifyAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      medRefs.push({ id: ref.id, name: med.name, limitPerDay: med.limitPerDay });
    }

    // 直近3日分の服薬記録を生成
    const intakePatterns = [
      // 2日前
      { dayOffset: -2, medIndex: 0, takenUnits: 1 },
      { dayOffset: -2, medIndex: 1, takenUnits: 1 },
      { dayOffset: -2, medIndex: 2, takenUnits: 1 },
      // 1日前
      { dayOffset: -1, medIndex: 0, takenUnits: 1 },
      { dayOffset: -1, medIndex: 1, takenUnits: 2 },
      { dayOffset: -1, medIndex: 2, takenUnits: 1 },
      // 今日
      { dayOffset: 0, medIndex: 0, takenUnits: 1 },
      { dayOffset: 0, medIndex: 1, takenUnits: 1 },
    ];

    // 日別カウンターを集計するためのマップ
    const dailyCountMap = new Map<string, number>();

    for (const pattern of intakePatterns) {
      const med = medRefs[pattern.medIndex];
      const takenDate = new Date(now.getTime() + pattern.dayOffset * 24 * 60 * 60 * 1000);
      // 服用時刻を設定（朝8時 JST = UTC-1時）
      takenDate.setUTCHours(pattern.dayOffset === 0 ? Math.max(now.getUTCHours() - 1, 0) : 8 - 9);
      takenDate.setUTCMinutes(0, 0, 0);
      const dateKey = getDateKey(takenDate);
      const counterKey = `${uid}_${med.id}_${dateKey}`;

      // dailyCount を加算
      const prevTotal = dailyCountMap.get(counterKey) ?? 0;
      const totalToday = prevTotal + pattern.takenUnits;
      dailyCountMap.set(counterKey, totalToday);

      const intakeRef = db().collection('intakes').doc();
      await intakeRef.set({
        userId: uid,
        medicationId: med.id,
        medicationName: med.name,
        limitPerDaySnapshot: med.limitPerDay,
        takenUnits: pattern.takenUnits,
        takenAt: admin.firestore.Timestamp.fromDate(takenDate),
        dateKey,
        isOverdose: totalToday > med.limitPerDay,
        totalToday,
        cancelled: false,
        isOdLog: false,
        moodTags: [],
        memo: '',
      });
    }

    // dailyCounts を書き込み
    for (const [counterDocId, total] of dailyCountMap) {
      const parts = counterDocId.split('_');
      // counterDocId = "{userId}_{medicationId}_{dateKey}"
      const medicationId = parts[1];
      const dateKey = parts.slice(2).join('_');
      await db().collection('dailyCounts').doc(counterDocId).set({
        userId: uid,
        medicationId,
        dateKey,
        total,
      }, { merge: true });
    }

    return res.status(201).json({ message: 'Demo setup complete.', expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error('[demo/setup] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to setup demo.' } });
  }
});
