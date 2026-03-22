"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationsRouter = void 0;
// 薬 CRUD ハンドラー
const express_1 = require("express");
const admin = require("firebase-admin");
const auth_1 = require("./middleware/auth");
exports.medicationsRouter = (0, express_1.Router)();
const db = () => admin.firestore();
// GET /v1/medications — ユーザーの薬一覧取得
exports.medicationsRouter.get('/', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    try {
        const snap = await db().collection('medications')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'asc')
            .get();
        const meds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json(meds);
    }
    catch (e) {
        console.error('medications error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list medications.' } });
    }
});
// POST /v1/medications — 薬を登録
exports.medicationsRouter.post('/', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
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
    }
    catch (e) {
        console.error('medications error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create medication.' } });
    }
});
// PUT /v1/medications/:id — 薬を更新（name / limitPerDay のみ）
exports.medicationsRouter.put('/:id', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    const id = req.params['id'];
    const { name, limitPerDay, notifyEnabled, notifyAt } = req.body;
    try {
        const ref = db().collection('medications').doc(id);
        const doc = await ref.get();
        if (!doc.exists)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
        if (doc.data()?.userId !== uid)
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
        const firestoreUpdates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '')
                return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name must be a non-empty string.' } });
            if (name.trim().length > 100)
                return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name max 100 chars.' } });
            firestoreUpdates.name = name.trim();
        }
        if (limitPerDay !== undefined) {
            if (!Number.isInteger(limitPerDay) || limitPerDay <= 0)
                return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay must be a positive integer.' } });
            if (limitPerDay > 99)
                return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay max is 99.' } });
            firestoreUpdates.limitPerDay = limitPerDay;
        }
        if (typeof notifyEnabled === 'boolean') {
            firestoreUpdates.notifyEnabled = notifyEnabled;
        }
        if (Array.isArray(notifyAt)) {
            const timeRegex = /^([01]\d|2[0-3]):00$/;
            if (notifyAt.length > 5 || notifyAt.some((t) => !timeRegex.test(t))) {
                return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'notifyAt invalid. Use HH:00 format, max 5.' } });
            }
            firestoreUpdates.notifyAt = notifyAt;
        }
        await ref.update(firestoreUpdates);
        const responseData = { id, ...doc.data() };
        if (firestoreUpdates.name)
            responseData.name = firestoreUpdates.name;
        if (firestoreUpdates.limitPerDay !== undefined)
            responseData.limitPerDay = firestoreUpdates.limitPerDay;
        return res.json(responseData);
    }
    catch (e) {
        console.error('medications error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update medication.' } });
    }
});
// DELETE /v1/medications/:id — 薬をハード削除
exports.medicationsRouter.delete('/:id', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    const id = req.params['id'];
    try {
        const ref = db().collection('medications').doc(id);
        const doc = await ref.get();
        if (!doc.exists)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
        if (doc.data()?.userId !== uid)
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
        await ref.delete();
        return res.status(204).send();
    }
    catch (e) {
        console.error('medications error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete medication.' } });
    }
});
//# sourceMappingURL=medications.js.map