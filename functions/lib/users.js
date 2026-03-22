"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
// ユーザープロフィール API
// onUserCreate トリガーは使わず、GET /v1/users/me の初回アクセス時にドキュメントを遅延生成する。
// 理由: v2 の beforeUserCreated はブロッキングトリガーのため、
//       Firestore 書き込みに失敗するとユーザー登録自体が拒否されるリスクがある。
const express_1 = require("express");
const admin = require("firebase-admin");
const auth_1 = require("./middleware/auth");
exports.usersRouter = (0, express_1.Router)();
const db = () => admin.firestore();
// ensureUserDoc: ユーザードキュメントが存在しない場合に作成する（遅延初期化）
async function ensureUserDoc(uid, email) {
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
exports.usersRouter.get('/me', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    try {
        const email = req.email;
        await ensureUserDoc(uid, email);
        const doc = await db().collection('users').doc(uid).get();
        return res.json({ id: doc.id, ...doc.data() });
    }
    catch {
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user.' } });
    }
});
// PUT /v1/users/me — language / notificationToken 更新
exports.usersRouter.put('/me', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    const { language, notificationToken } = req.body;
    const updates = {};
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
    }
    catch {
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user.' } });
    }
});
//# sourceMappingURL=users.js.map