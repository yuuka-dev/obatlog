// ユーザープロフィール API
// onUserCreate トリガーは使わず、GET /v1/users/me の初回アクセス時にドキュメントを遅延生成する。
// 理由: v2 の beforeUserCreated はブロッキングトリガーのため、
//       Firestore 書き込みに失敗するとユーザー登録自体が拒否されるリスクがある。
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const usersRouter = Router();
const db = () => admin.firestore();

// ensureUserDoc: ユーザードキュメントが存在しない場合に作成する（遅延初期化）
async function ensureUserDoc(uid: string, email: string): Promise<void> {
  const ref = db().collection('users').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) {
    await ref.set({
      email,
      language: 'ja',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notificationToken: null,
    });
  }
}

// GET /v1/users/me — ユーザープロフィール取得（初回は自動生成）
usersRouter.get('/me', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  try {
    const email = (req as AuthenticatedRequest).email;
    await ensureUserDoc(uid, email);
    const doc = await db().collection('users').doc(uid).get();
    return res.json({ id: doc.id, ...doc.data() });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user.' } });
  }
});

// PUT /v1/users/me — language / notificationToken 更新
usersRouter.put('/me', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { language, notificationToken } = req.body;
  const updates: Record<string, unknown> = {};

  if (language !== undefined) {
    if (!['ja', 'en', 'id'].includes(language)) {
      return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'language must be ja, en, or id.' } });
    }
    updates.language = language;
  }
  if (typeof notificationToken === 'string') {
    updates.notificationToken = notificationToken;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'No valid fields.' } });
  }

  try {
    await db().collection('users').doc(uid).update(updates);
    return res.json({ id: uid, ...updates });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user.' } });
  }
});
