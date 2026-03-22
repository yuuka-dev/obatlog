"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intakesRouter = void 0;
exports.calcOverdose = calcOverdose;
// 服薬記録 API + 過量チェックロジック
const express_1 = require("express");
const admin = require("firebase-admin");
const auth_1 = require("./middleware/auth");
exports.intakesRouter = (0, express_1.Router)();
const db = () => admin.firestore();
// calcOverdose: 過量チェック純粋関数（テスト可能）
// previousTotal: 今回の記録を除く当日・同薬の累計
// takenUnits: 今回飲む錠数
// limitPerDay: 1日上限
function calcOverdose(previousTotal, takenUnits, limitPerDay) {
    const totalToday = previousTotal + takenUnits;
    return { isOverdose: totalToday > limitPerDay, totalToday };
}
// POST /v1/intakes — 服薬記録（過量チェック含む・超過でも必ず保存）
exports.intakesRouter.post('/', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    const body = req.body;
    const { medicationId, takenUnits } = body;
    if (!medicationId || typeof medicationId !== 'string') {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'medicationId is required.' } });
    }
    if (!Number.isInteger(takenUnits) || takenUnits <= 0) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits must be a positive integer.' } });
    }
    const isOdLog = body.isOdLog === true;
    const moodTags = isOdLog && Array.isArray(body.moodTags) ? body.moodTags : [];
    const memo = isOdLog && typeof body.memo === 'string' ? body.memo : '';
    // バリデーション強化
    if (!isOdLog && takenUnits > 99) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits max is 99.' } });
    }
    if (isOdLog && takenUnits > 999) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits max is 999 for OD log.' } });
    }
    if (moodTags.length > 5 || moodTags.some((t) => typeof t !== 'string' || t.length > 50)) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'moodTags invalid.' } });
    }
    if (memo.length > 500) {
        return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'memo max 500 chars.' } });
    }
    try {
        // 薬情報取得
        const medDoc = await db().collection('medications').doc(medicationId).get();
        if (!medDoc.exists)
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
        if (medDoc.data()?.userId !== uid)
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
        const { name: medicationName, limitPerDay } = medDoc.data();
        const dateKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
        const counterDocId = `${uid}_${medicationId}_${dateKey}`;
        const counterRef = db().collection('dailyCounts').doc(counterDocId);
        let intakeId;
        let isOverdose;
        let totalToday;
        if (isOdLog) {
            // OD記録: dailyCounts に加算しない
            const counterSnap = await counterRef.get();
            totalToday = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
            isOverdose = true;
            const intakeRef = db().collection('intakes').doc();
            await intakeRef.set({
                userId: uid, medicationId, medicationName,
                limitPerDaySnapshot: limitPerDay, takenUnits,
                takenAt: admin.firestore.FieldValue.serverTimestamp(),
                dateKey, isOverdose, totalToday, cancelled: false,
                isOdLog: true, moodTags, memo,
            });
            intakeId = intakeRef.id;
        }
        else {
            // 通常記録: トランザクションで dailyCounts を原子更新
            const result = await db().runTransaction(async (tx) => {
                const counterSnap = await tx.get(counterRef);
                const previousTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
                const { isOverdose: od, totalToday: tt } = calcOverdose(previousTotal, takenUnits, limitPerDay);
                tx.set(counterRef, { userId: uid, medicationId, dateKey, total: tt }, { merge: true });
                const intakeRef = db().collection('intakes').doc();
                tx.set(intakeRef, {
                    userId: uid, medicationId, medicationName,
                    limitPerDaySnapshot: limitPerDay, takenUnits,
                    takenAt: admin.firestore.FieldValue.serverTimestamp(),
                    dateKey, isOverdose: od, totalToday: tt, cancelled: false,
                    isOdLog: false, moodTags: [], memo: '',
                });
                return { intakeId: intakeRef.id, isOverdose: od, totalToday: tt };
            });
            intakeId = result.intakeId;
            isOverdose = result.isOverdose;
            totalToday = result.totalToday;
        }
        return res.status(201).json({ intakeId, isOverdose, totalToday, dateKey });
    }
    catch (e) {
        console.error('intakes POST error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record intake.' } });
    }
});
// PATCH /v1/intakes/:id — 記録取り消し（ソフトデリート）
exports.intakesRouter.patch('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const uid = req.uid;
        const intakeId = req.params['id'];
        const intakeRef = db().collection('intakes').doc(intakeId);
        const intakeSnap = await intakeRef.get();
        if (!intakeSnap.exists) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Intake not found.' } });
        }
        if (intakeSnap.data()?.userId !== uid) {
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your intake.' } });
        }
        if (intakeSnap.data()?.cancelled === true) {
            return res.status(400).json({ error: { code: 'ALREADY_CANCELLED', message: 'Already cancelled.' } });
        }
        const data = intakeSnap.data();
        const counterDocId = `${uid}_${data.medicationId}_${data.dateKey}`;
        const counterRef = db().collection('dailyCounts').doc(counterDocId);
        // OD記録はdailyCountsに加算していないので減算もしない
        if (!data.isOdLog) {
            await db().runTransaction(async (tx) => {
                // Firestore トランザクション: 全 read を全 write の前に行う
                const counterSnap = await tx.get(counterRef);
                tx.update(intakeRef, { cancelled: true });
                if (counterSnap.exists) {
                    const newTotal = Math.max(0, (counterSnap.data()?.total ?? 0) - data.takenUnits);
                    tx.update(counterRef, { total: newTotal });
                }
            });
        }
        else {
            await intakeRef.update({ cancelled: true });
        }
        return res.status(204).send();
    }
    catch (err) {
        console.error('cancelIntake error:', err);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel intake.' } });
    }
});
// GET /v1/intakes — 服薬記録取得
// クエリパラメータ: dateKey=YYYY-MM-DD (特定日) or limit=N (直近N件, デフォルト30)
exports.intakesRouter.get('/', auth_1.verifyToken, async (req, res) => {
    const { uid } = req;
    const { dateKey, limit } = req.query;
    try {
        let query = db().collection('intakes').where('userId', '==', uid);
        if (dateKey) {
            // 特定日フィルタ（ホーム画面用）
            query = query
                .where('cancelled', '==', false)
                .where('dateKey', '==', dateKey)
                .orderBy('takenAt', 'asc');
            const snap = await query.get();
            return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        else {
            // 直近N件（ログ一覧用）
            const n = Math.min(parseInt(limit) || 30, 100);
            const snap = await query
                .where('cancelled', '==', false)
                .orderBy('takenAt', 'desc')
                .limit(n)
                .get();
            return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
    }
    catch (e) {
        console.error('intakes GET error:', e);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list intakes.' } });
    }
});
//# sourceMappingURL=intakes.js.map