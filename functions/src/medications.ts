// 薬 CRUD ハンドラー
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const medicationsRouter = Router();
const db = () => admin.firestore();

// GET /v1/medications — ユーザーの薬一覧取得
medicationsRouter.get('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  try {
    const snap = await db().collection('medications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'asc')
      .get();
    const meds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(meds);
  } catch (e) {
    console.error('medications error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list medications.' } });
  }
});

// POST /v1/medications — 薬を登録
medicationsRouter.post('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { name, limitPerDay } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name is required.' } });
  }
  if (!Number.isInteger(limitPerDay) || limitPerDay <= 0) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay must be a positive integer.' } });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name max 100 chars.' } });
  }
  if (limitPerDay > 99) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay max is 99.' } });
  }
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await db().collection('medications').add({
      userId: uid,
      name: name.trim(),
      limitPerDay,
      notifyEnabled: false,
      notifyAt: [],
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json({ id: ref.id, userId: uid, name: name.trim(), limitPerDay });
  } catch (e) {
    console.error('medications error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create medication.' } });
  }
});

// PUT /v1/medications/:id — 薬を更新（name / limitPerDay / 通知設定）
medicationsRouter.put('/:id', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const id = req.params['id'] as string;
  const { name, limitPerDay, notifyEnabled, notifyAt } = req.body;
  try {
    const ref = db().collection('medications').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
    if (doc.data()?.userId !== uid) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const firestoreUpdates: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name must be a non-empty string.' } });
      if (name.trim().length > 100) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name max 100 chars.' } });
      firestoreUpdates.name = name.trim();
    }
    if (limitPerDay !== undefined) {
      if (!Number.isInteger(limitPerDay) || limitPerDay <= 0) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay must be a positive integer.' } });
      if (limitPerDay > 99) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay max is 99.' } });
      firestoreUpdates.limitPerDay = limitPerDay;
    }
    if (typeof notifyEnabled === 'boolean') {
      firestoreUpdates.notifyEnabled = notifyEnabled;
    }
    if (Array.isArray(notifyAt)) {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (notifyAt.length > 5 || notifyAt.some((t: string) => !timeRegex.test(t))) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'notifyAt invalid. Use HH:MM format, max 5.' } });
      }
      firestoreUpdates.notifyAt = notifyAt;
    }
    await ref.update(firestoreUpdates);
    // 返却値は「更新後」を返さないと、通知時刻が古い状態でクライアントに反映される
    const updatedSnap = await ref.get();
    const updatedData = updatedSnap.data();
    if (!updatedData) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load updated medication.' } });
    }
    return res.json({ id: updatedSnap.id, ...updatedData });
  } catch (e) {
    console.error('medications error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update medication.' } });
  }
});

// DELETE /v1/medications/:id — 薬をハード削除
medicationsRouter.delete('/:id', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const id = req.params['id'] as string;
  try {
    const ref = db().collection('medications').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
    if (doc.data()?.userId !== uid) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    await ref.delete();
    return res.status(204).send();
  } catch (e) {
    console.error('medications error:', e);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete medication.' } });
  }
});
