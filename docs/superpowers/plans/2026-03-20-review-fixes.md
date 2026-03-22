# ObatLog レビュー改善 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レビューで発見された23課題 + OD記録機能 + LP + レスポンシブ + FCM通知を実装する。

**Architecture:** バックエンドは Firestore トランザクション化 + dailyCounts カウンター導入で過量チェック競合を解消。フロントエンドは AppLayout で レスポンシブ共通化、共有UIコンポーネント（Stepper/Toast/ProgressBar）を導入。FCM通知は Cloud Scheduler + medications の通知フィールドで実現。

**Tech Stack:** Astro 4, React 18, Tailwind CSS 3, Firebase (Auth / Firestore / Functions v2 / Hosting / FCM), vite-plugin-pwa, TypeScript, Jest

**Spec:** `docs/superpowers/specs/2026-03-20-obatlog-review-fixes-design.md`

**Branch:** `feature/mvp`（ソースコードは `.worktrees/feature-mvp/` にある worktree。`main` にはソースなし）

---

## Team Assignment

| チーム | 担当タスク |
|---|---|
| **Med-API** | Task 1-6（バックエンド全般） |
| **Med-UI** | Task 7-14（フロントエンド全般） |
| **Med-Test** | Task 15-16（テスト） |
| **Config** | Task 17（設定・インフラ。誰でも着手可） |

**並列実行ルール:**
- Task 17（Config）は他タスクと並列実行可
- Task 1-6（API）と Task 7-14（UI）は並列実行可（同一ファイルを触らない）
- Task 15-16（Test）は Task 1-6 完了後に実行
- 同一ファイルの同時編集は禁止（CLAUDE.md準拠）

---

## File Map

### 新規作成ファイル

| ファイル | 役割 | 担当 |
|---|---|---|
| `functions/src/scripts/migrate-intakes.ts` | 既存データマイグレーション | Med-API |
| `functions/src/notify.ts` | FCM通知 Cloud Scheduler ハンドラー | Med-API |
| `firestore.indexes.json` | Firestore 複合インデックス定義 | Config |
| `src/components/Stepper.tsx` | +/- ステッパー入力 | Med-UI |
| `src/components/ProgressBar.tsx` | 累計プログレスバー | Med-UI |
| `src/components/Toast.tsx` | Toast通知（取り消し付き） | Med-UI |
| `src/components/AppLayout.tsx` | レスポンシブレイアウト共通化 | Med-UI |
| `src/components/SideNav.tsx` | PC用サイドナビ + 今日のサマリー | Med-UI |
| `src/components/LandingPage.tsx` | LP コンポーネント | Med-UI |
| `src/components/OdLogForm.tsx` | OD記録フォーム | Med-UI |

### 変更ファイル

| ファイル | 変更内容 | 担当 |
|---|---|---|
| `functions/src/index.ts` | CORS に PATCH 追加、express.json 制限 | Med-API |
| `functions/src/middleware/auth.ts` | email をリクエストに付与 | Med-API |
| `functions/src/intakes.ts` | トランザクション化、PATCH追加、OD対応、バリデーション強化 | Med-API |
| `functions/src/medications.ts` | バリデーション強化、通知フィールド対応 | Med-API |
| `functions/src/users.ts` | getUser() 削除 | Med-API |
| `firebase.json` | ヘッダー追加、リライト削除 | Config |
| `astro.config.mjs` | manifest修正、runtimeCaching追加 | Config |
| `src/components/IntakeForm.tsx` | ステッパー、Toast、ダブルタップ防止、OD、完了表示 | Med-UI |
| `src/components/MedicationForm.tsx` | 通知設定UI追加 | Med-UI |
| `src/components/MedicationList.tsx` | エラーハンドリング改善 | Med-UI |
| `src/components/LogList.tsx` | OD区別表示、i18n修正 | Med-UI |
| `src/components/TabNav.tsx` | モバイルのみ表示 | Med-UI |
| `src/api/intakes.ts` | cancelIntake() 追加、型拡張 | Med-UI |
| `src/api/medications.ts` | 通知フィールド型追加 | Med-UI |
| `src/i18n/ja.json` | 新規キー追加 | Med-UI |
| `src/i18n/en.json` | 新規キー追加 | Med-UI |
| `src/i18n/id.json` | 新規キー追加 | Med-UI |
| `src/pages/index.astro` | AppLayout 適用、LP出し分け | Med-UI |
| `src/pages/medications.astro` | AppLayout 適用 | Med-UI |
| `src/pages/logs.astro` | AppLayout 適用 | Med-UI |

---

## Task 1: Auth ミドルウェア拡張 + index.ts 修正（Med-API）

**Files:**
- Modify: `functions/src/middleware/auth.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: auth.ts に email フィールド追加**

```typescript
// functions/src/middleware/auth.ts
// AuthenticatedRequest に email を追加
export interface AuthenticatedRequest extends Request {
  uid: string;
  email: string;
}

// verifyToken 内、req.uid = decoded.uid; の後に追加
(req as AuthenticatedRequest).email = decoded.email ?? '';
```

- [ ] **Step 2: index.ts の CORS に PATCH 追加 + express.json 制限**

```typescript
// functions/src/index.ts
// cors の origin callback の後の設定に methods を追加
app.use(cors({
  origin: (origin, callback) => { /* 既存のまま */ },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// express.json() を制限付きに変更
app.use(express.json({ limit: '10kb' }));
```

- [ ] **Step 3: ビルド確認**

Run: `cd functions && npm run build`
Expected: コンパイル成功

- [ ] **Step 4: コミット**

```bash
git add functions/src/middleware/auth.ts functions/src/index.ts
git commit -m "feat: auth middleware に email 追加、CORS PATCH 許可、body size 制限"
```

---

## Task 2: intakes.ts トランザクション化 + PATCH + OD対応（Med-API）

**Files:**
- Modify: `functions/src/intakes.ts`

これは最重要タスク。過量チェックのレースコンディション解消。

- [ ] **Step 1: calcOverdose を維持しつつ、POST ハンドラーをトランザクション化**

`POST /v1/intakes` の処理を `db().runTransaction()` で囲む。dailyCounts カウンタードキュメントを導入。

```typescript
// intakes.ts POST ハンドラー内
// 既存の todaySnap クエリ + reduce を以下に置換:

const isOdLog = body.isOdLog === true;
const moodTags: string[] = isOdLog && Array.isArray(body.moodTags) ? body.moodTags : [];
const memo: string = isOdLog && typeof body.memo === 'string' ? body.memo : '';

// バリデーション強化
if (!isOdLog && takenUnits > 99) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits max is 99.' } });
}
if (isOdLog && takenUnits > 999) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'takenUnits max is 999 for OD log.' } });
}
if (moodTags.length > 5 || moodTags.some((t: string) => typeof t !== 'string' || t.length > 50)) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'moodTags invalid.' } });
}
if (memo.length > 500) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'memo max 500 chars.' } });
}

const dateKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const counterDocId = `${uid}_${medicationId}_${dateKey}`;
const counterRef = db().collection('dailyCounts').doc(counterDocId);

let intakeId: string;
let isOverdose: boolean;
let totalToday: number;

if (isOdLog) {
  // OD記録: dailyCounts に加算しない
  const counterSnap = await counterRef.get();
  totalToday = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
  isOverdose = true;
  const intakeRef = db().collection('intakes').doc();
  await intakeRef.set({
    userId: uid, medicationId, medicationName: medDoc.data()!.name,
    limitPerDaySnapshot: limitPerDay, takenUnits,
    takenAt: admin.firestore.FieldValue.serverTimestamp(),
    dateKey, isOverdose, totalToday, cancelled: false,
    isOdLog: true, moodTags, memo,
  });
  intakeId = intakeRef.id;
} else {
  // 通常記録: トランザクションで dailyCounts を原子更新
  const result = await db().runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const previousTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
    const { isOverdose: od, totalToday: tt } = calcOverdose(previousTotal, takenUnits, limitPerDay);

    tx.set(counterRef, { userId: uid, medicationId, dateKey, total: tt }, { merge: true });

    const intakeRef = db().collection('intakes').doc();
    tx.set(intakeRef, {
      userId: uid, medicationId, medicationName: medDoc.data()!.name,
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

res.status(201).json({ intakeId, isOverdose, totalToday, dateKey });
```

- [ ] **Step 2: PATCH /v1/intakes/:id ハンドラー追加（取り消し）**

```typescript
// intakes.ts に追加
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    const intakeId = req.params['id'] as string;
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

    const data = intakeSnap.data()!;
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
    } else {
      await intakeRef.update({ cancelled: true });
    }

    res.status(204).send();
  } catch (err) {
    console.error('cancelIntake error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel intake.' } });
  }
});
```

- [ ] **Step 3: GET の cancelled 除外**

```typescript
// GET ハンドラー内の既存クエリを修正
// dateKey 指定の場合:
let q = db().collection('intakes')
  .where('userId', '==', uid)
  .where('cancelled', '==', false)
  .where('dateKey', '==', dateKey)
  .orderBy('takenAt', 'asc');

// limit 指定の場合:
let q = db().collection('intakes')
  .where('userId', '==', uid)
  .where('cancelled', '==', false)
  .orderBy('takenAt', 'desc')
  .limit(n);
```

- [ ] **Step 4: ビルド確認**

Run: `cd functions && npm run build`
Expected: コンパイル成功

- [ ] **Step 5: コミット**

```bash
git add functions/src/intakes.ts
git commit -m "feat: intakes トランザクション化、PATCH取り消し、OD記録対応"
```

---

## Task 3: medications.ts バリデーション強化 + 通知フィールド（Med-API）

**Files:**
- Modify: `functions/src/medications.ts`

- [ ] **Step 1: POST バリデーション強化**

```typescript
// POST ハンドラー内、既存バリデーションの後に追加:
if (name.trim().length > 100) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name max 100 chars.' } });
}
if (limitPerDay > 99) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay max is 99.' } });
}
```

- [ ] **Step 2: PUT に通知フィールド対応追加**

```typescript
// PUT ハンドラー内、firestoreUpdates 構築部分を拡張:
const { name, limitPerDay, notifyEnabled, notifyAt } = req.body;

// 既存の name, limitPerDay 処理の後に追加:
if (typeof notifyEnabled === 'boolean') {
  firestoreUpdates.notifyEnabled = notifyEnabled;
}
if (Array.isArray(notifyAt)) {
  // バリデーション: 最大5個、HH:00形式
  const timeRegex = /^([01]\d|2[0-3]):00$/;
  if (notifyAt.length > 5 || notifyAt.some((t: string) => !timeRegex.test(t))) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'notifyAt invalid. Use HH:00 format, max 5.' } });
  }
  firestoreUpdates.notifyAt = notifyAt;
}
```

- [ ] **Step 3: POST で通知フィールドのデフォルト値をセット**

```typescript
// POST の db().collection('medications').add() に追加:
notifyEnabled: false,
notifyAt: [],
```

- [ ] **Step 4: ビルド確認 + コミット**

```bash
cd functions && npm run build
git add functions/src/medications.ts
git commit -m "feat: medications バリデーション強化、通知フィールド追加"
```

---

## Task 4: users.ts 最適化（Med-API）

**Files:**
- Modify: `functions/src/users.ts`

- [ ] **Step 1: getUser() 呼び出しを削除し、decoded.email を使用**

```typescript
// GET /v1/users/me ハンドラー内
// 既存の admin.auth().getUser(uid) 呼び出しを削除
// 代わりに AuthenticatedRequest から email を取得:
const email = (req as AuthenticatedRequest).email;

// ensureUserDoc に email を渡す（既存のまま）
```

- [ ] **Step 2: PUT /v1/users/me に notificationToken 更新を追加**

```typescript
// PUT ハンドラー内に追加:
const { language, notificationToken } = req.body;
const updates: Record<string, unknown> = {};

if (language && ['ja', 'en', 'id'].includes(language)) {
  updates.language = language;
}
if (typeof notificationToken === 'string') {
  updates.notificationToken = notificationToken;
}
if (Object.keys(updates).length === 0) {
  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'No valid fields.' } });
}
```

- [ ] **Step 3: ビルド確認 + コミット**

```bash
cd functions && npm run build
git add functions/src/users.ts
git commit -m "feat: users.ts getUser削除、notificationToken更新対応"
```

---

## Task 5: マイグレーションスクリプト（Med-API）

**Files:**
- Create: `functions/src/scripts/migrate-intakes.ts`

- [ ] **Step 1: マイグレーションスクリプト作成**

```typescript
// functions/src/scripts/migrate-intakes.ts
import * as admin from 'firebase-admin';

// Emulator モードチェック
const useEmulator = process.argv.includes('--emulator');
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

admin.initializeApp();
const db = admin.firestore();

async function migrate() {
  const intakes = await db.collection('intakes').get();
  console.log(`Found ${intakes.size} intakes to migrate.`);

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of intakes.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    if (data.cancelled === undefined) updates.cancelled = false;
    if (data.isOdLog === undefined) updates.isOdLog = false;
    if (data.moodTags === undefined) updates.moodTags = [];
    if (data.memo === undefined) updates.memo = '';

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
      batchCount++;
    }

    // Firestore batch は最大500件。commit後は新しいbatchを作成
    if (batchCount === 500) {
      await batch.commit();
      console.log(`Committed ${count} documents so far.`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Migration complete. Updated ${count} documents.`);
}

migrate().catch(console.error);
```

- [ ] **Step 2: ビルド確認 + コミット**

```bash
cd functions && npm run build
git add functions/src/scripts/migrate-intakes.ts
git commit -m "feat: intakes マイグレーションスクリプト追加"
```

---

## Task 6: FCM通知ハンドラー（Med-API）

**Files:**
- Create: `functions/src/notify.ts`
- Modify: `functions/src/index.ts`（export追加）

- [ ] **Step 1: notify.ts 作成**

```typescript
// functions/src/notify.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

export const sendMedicationReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
  async () => {
    const now = new Date();
    const currentHour = now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false });
    const timeSlot = `${currentHour.padStart(2, '0')}:00`;
    const dateKey = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

    // 通知対象の薬を取得
    const medsSnap = await db().collection('medications')
      .where('notifyEnabled', '==', true)
      .where('notifyAt', 'array-contains', timeSlot)
      .get();

    if (medsSnap.empty) return;

    // ユーザーごとにグループ化
    const userMeds = new Map<string, Array<{ name: string; medicationId: string; limitPerDay: number }>>();
    for (const doc of medsSnap.docs) {
      const data = doc.data();
      const list = userMeds.get(data.userId) ?? [];
      list.push({ name: data.name, medicationId: doc.id, limitPerDay: data.limitPerDay });
      userMeds.set(data.userId, list);
    }

    // 各ユーザーに通知送信
    for (const [userId, meds] of userMeds) {
      const userSnap = await db().collection('users').doc(userId).get();
      const token = userSnap.data()?.notificationToken;
      if (!token) continue;

      for (const med of meds) {
        // dailyCounts で上限チェック
        const counterRef = db().collection('dailyCounts').doc(`${userId}_${med.medicationId}_${dateKey}`);
        const counterSnap = await counterRef.get();
        const currentTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
        if (currentTotal >= med.limitPerDay) continue;

        try {
          await admin.messaging().send({
            token,
            notification: { title: 'ObatLog', body: `${med.name} の時間だよ` },
            webpush: { fcmOptions: { link: '/' } },
          });
        } catch (err) {
          console.error(`FCM send error for user ${userId}:`, err);
        }
      }
    }
  }
);
```

- [ ] **Step 2: index.ts に export 追加**

```typescript
// functions/src/index.ts の末尾に追加
export { sendMedicationReminders } from './notify';
```

- [ ] **Step 3: ビルド確認 + コミット**

```bash
cd functions && npm run build
git add functions/src/notify.ts functions/src/index.ts
git commit -m "feat: FCM通知 Cloud Scheduler ハンドラー追加"
```

---

## Task 7: i18n キー追加（Med-UI）

**Files:**
- Modify: `src/i18n/ja.json`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/id.json`

- [ ] **Step 1: ja.json に新規キー追加**

設計書セクション13の全キーを追加。`od.*`, `moodTags.*`, `toast.*`, `lp.*`, `home.allComplete`, `home.offline`, `home.fetchError`, `empty.logs.goHome`, `logs.total`, `medications.notifyEnabled`, `medications.notifyAt`, `medications.addTime`, `sidebar.todaySummary` の計33キー。

- [ ] **Step 2: en.json に英語訳追加**

- [ ] **Step 3: id.json にインドネシア語訳追加**

- [ ] **Step 4: コミット**

```bash
git add src/i18n/ja.json src/i18n/en.json src/i18n/id.json
git commit -m "feat: i18n 新規キー追加（OD記録、LP、Toast等）"
```

---

## Task 8: 共有UIコンポーネント作成（Med-UI）

**Files:**
- Create: `src/components/Stepper.tsx`
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/Toast.tsx`

- [ ] **Step 1: Stepper.tsx 作成**

```tsx
// src/components/Stepper.tsx
import React from 'react';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export default function Stepper({ value, onChange, min = 1, max, unit }: StepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-600 disabled:opacity-30">
        -
      </button>
      <span className="w-10 text-center text-base font-semibold">{value}</span>
      <button type="button"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
        disabled={max !== undefined && value >= max}
        className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-600 disabled:opacity-30">
        +
      </button>
      {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
    </div>
  );
}
```

- [ ] **Step 2: ProgressBar.tsx 作成**

```tsx
// src/components/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  unit?: string;
}

export default function ProgressBar({ current, max, unit = '' }: ProgressBarProps) {
  const pct = Math.min(100, (current / max) * 100);
  const atLimit = current >= max;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-amber-500' : 'bg-amber-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-sm font-medium whitespace-nowrap ${atLimit ? 'text-amber-600' : 'text-gray-600'}`}>
        {current} / {max} {unit}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Toast.tsx 作成**

```tsx
// src/components/Toast.tsx
import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
}

interface ToastProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function Toast({ items, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 space-y-2">
      {items.map(item => (
        <ToastEntry key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gray-800 text-white rounded-xl p-4 flex justify-between items-center shadow-lg">
      <span className="text-sm">{item.message}</span>
      {item.undoLabel && item.onUndo && (
        <button onClick={item.onUndo} className="text-amber-400 font-medium text-sm ml-3 shrink-0">
          {item.undoLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: コミット**

```bash
git add src/components/Stepper.tsx src/components/ProgressBar.tsx src/components/Toast.tsx
git commit -m "feat: 共有UIコンポーネント追加（Stepper, ProgressBar, Toast）"
```

---

## Task 9: AppLayout + SideNav（Med-UI）

**Files:**
- Create: `src/components/SideNav.tsx`
- Create: `src/components/AppLayout.tsx`
- Modify: `src/components/TabNav.tsx`

- [ ] **Step 1: SideNav.tsx 作成**

PC用サイドナビ。ナビゲーション + 今日のサマリー（ミニプログレスバー）。

```tsx
// src/components/SideNav.tsx
import React from 'react';
import ProgressBar from './ProgressBar';
import { t, getLang } from '../i18n';

interface MedSummary {
  id: string;
  name: string;
  limitPerDay: number;
  todayTotal: number;
}

interface SideNavProps {
  active: 'home' | 'medications' | 'logs';
  medSummaries: MedSummary[];
}

const navItems = [
  { key: 'home' as const, href: '/', icon: '🏠', labelKey: 'nav.home' },
  { key: 'medications' as const, href: '/medications', icon: '💊', labelKey: 'nav.medications' },
  { key: 'logs' as const, href: '/logs', icon: '📋', labelKey: 'nav.logs' },
];

export default function SideNav({ active, medSummaries }: SideNavProps) {
  const lang = getLang();
  return (
    <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 bg-white border-r border-gray-100 p-4">
      <h1 className="text-lg font-bold text-amber-500 mb-6">ObatLog</h1>
      <nav className="space-y-1">
        {navItems.map(item => (
          <a key={item.key} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              ${active === item.key ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span>{item.icon}</span>
            <span>{t(item.labelKey as any, lang)}</span>
          </a>
        ))}
      </nav>
      {medSummaries.length > 0 && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">{t('sidebar.todaySummary' as any, lang)}</p>
          <div className="space-y-2">
            {medSummaries.map(med => (
              <div key={med.id}>
                <p className="text-xs text-gray-600 mb-1">{med.name}</p>
                <ProgressBar current={med.todayTotal} max={med.limitPerDay} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: AppLayout.tsx 作成**

```tsx
// src/components/AppLayout.tsx
import React, { useState, useEffect, type ReactNode } from 'react';
import TabNav from './TabNav';
import SideNav from './SideNav';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listMedications } from '../api/medications';
import { listIntakesByDate } from '../api/intakes';

interface AppLayoutProps {
  active: 'home' | 'medications' | 'logs';
  children: ReactNode;
}

export default function AppLayout({ active, children }: AppLayoutProps) {
  const [isPC, setIsPC] = useState(false);
  const [medSummaries, setMedSummaries] = useState<Array<{
    id: string; name: string; limitPerDay: number; todayTotal: number;
  }>>([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsPC(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isPC) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const dateKey = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
        const [meds, intakes] = await Promise.all([
          listMedications(),
          listIntakesByDate(dateKey),
        ]);
        const summaries = meds.map(med => {
          const total = intakes
            .filter(i => i.medicationId === med.id)
            .reduce((sum, i) => sum + i.takenUnits, 0);
          return { id: med.id, name: med.name, limitPerDay: med.limitPerDay, todayTotal: total };
        });
        setMedSummaries(summaries);
      } catch { /* サイドバーのエラーは無視 */ }
    });
    return () => unsub();
  }, [isPC]);

  return (
    <div className="min-h-screen bg-gray-50">
      {isPC && <SideNav active={active} medSummaries={medSummaries} />}
      <main className={`${isPC ? 'ml-56' : ''} pb-20 md:pb-4`}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {children}
        </div>
      </main>
      {!isPC && <TabNav active={active} />}
    </div>
  );
}
```

- [ ] **Step 3: TabNav.tsx を変更不要（AppLayout内で条件表示するため）**

TabNav.tsx 自体は変更不要。AppLayout 内で `{!isPC && <TabNav />}` として使用。

- [ ] **Step 4: コミット**

```bash
git add src/components/SideNav.tsx src/components/AppLayout.tsx
git commit -m "feat: AppLayout レスポンシブレイアウト + SideNav 追加"
```

---

## Task 10: API クライアント拡張（Med-UI）

**Files:**
- Modify: `src/api/intakes.ts`
- Modify: `src/api/medications.ts`

- [ ] **Step 1: intakes.ts に cancelIntake + 型拡張**

```typescript
// src/api/intakes.ts

// Intake インターフェースに追加:
cancelled: boolean;
isOdLog: boolean;
moodTags: string[];
memo: string;

// createIntake の戻り値に dateKey 追加:
export async function createIntake(
  medicationId: string,
  takenUnits: number,
  options?: { isOdLog?: boolean; moodTags?: string[]; memo?: string }
): Promise<{ intakeId: string; isOverdose: boolean; totalToday: number; dateKey: string }> {
  return apiFetch('/v1/intakes', {
    method: 'POST',
    body: JSON.stringify({ medicationId, takenUnits, ...options }),
  });
}

// 追加:
export async function cancelIntake(intakeId: string): Promise<void> {
  await apiFetch(`/v1/intakes/${intakeId}`, { method: 'PATCH' });
}
```

- [ ] **Step 2: medications.ts に通知フィールド型追加 + updateMedication 拡張**

```typescript
// Medication インターフェースに追加:
notifyEnabled: boolean;
notifyAt: string[];

// updateMedication の data 引数型を拡張:
export async function updateMedication(
  id: string,
  data: Partial<Pick<Medication, 'name' | 'limitPerDay' | 'notifyEnabled' | 'notifyAt'>>
): Promise<void> {
  // 既存の実装はそのまま
}
```

- [ ] **Step 3: コミット**

```bash
git add src/api/intakes.ts src/api/medications.ts
git commit -m "feat: API クライアント拡張（cancelIntake、OD対応、通知フィールド）"
```

---

## Task 11: OdLogForm コンポーネント（Med-UI）

**Files:**
- Create: `src/components/OdLogForm.tsx`

- [ ] **Step 1: OdLogForm.tsx 作成**

薬選択プルダウン + ステッパー + 気分タグチップ + メモ欄のフォーム。

```tsx
// src/components/OdLogForm.tsx
import React, { useState } from 'react';
import Stepper from './Stepper';
import { createIntake } from '../api/intakes';
import { t, getLang } from '../i18n';
import type { Medication } from '../api/medications';

interface OdLogFormProps {
  medications: Medication[];
  onSuccess: (result: { intakeId: string; dateKey: string }) => void;
  onCancel: () => void;
}

const MOOD_TAG_KEYS = [
  'struggling', 'anxious', 'cantSleep', 'impulsive', 'irritated', 'dontRemember',
] as const;

export default function OdLogForm({ medications, onSuccess, onCancel }: OdLogFormProps) {
  const lang = getLang();
  const [medId, setMedId] = useState(medications[0]?.id ?? '');
  const [units, setUnits] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  };

  const handleSubmit = async () => {
    if (!medId || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await createIntake(medId, units, {
        isOdLog: true,
        moodTags: tags.map(k => t(`moodTags.${k}` as any, lang)),
        memo,
      });
      onSuccess({ intakeId: result.intakeId, dateKey: result.dateKey });
    } catch {
      setError(t('toast.error' as any, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
      <p className="font-medium text-gray-700">{t('od.title' as any, lang)}</p>

      <select value={medId} onChange={e => setMedId(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <Stepper value={units} onChange={setUnits} min={1} unit={t('od.units' as any, lang)} />

      <div>
        <p className="text-sm text-gray-500 mb-2">{t('od.moodLabel' as any, lang)}</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAG_KEYS.map(key => (
            <button key={key} type="button" onClick={() => toggleTag(key)}
              className={`px-3 py-1.5 rounded-full text-sm
                ${tags.includes(key) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {t(`moodTags.${key}` as any, lang)}
            </button>
          ))}
        </div>
      </div>

      <textarea value={memo} onChange={e => setMemo(e.target.value)}
        placeholder={t('od.memoLabel' as any, lang)} maxLength={500}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />

      {error && <p className="text-amber-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 bg-amber-400 text-white py-3 rounded-lg font-medium disabled:opacity-50">
          {loading ? '...' : t('od.submit' as any, lang)}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-lg font-medium">
          {t('od.cancel' as any, lang)}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/OdLogForm.tsx
git commit -m "feat: OD記録フォームコンポーネント追加"
```

---

## Task 12: IntakeForm.tsx 改修（Med-UI）

**Files:**
- Modify: `src/components/IntakeForm.tsx`

これは最大の変更。ステッパー化、ダブルタップ防止、Toast、OD記録、プログレスバー、完了表示、エラーハンドリング、overdoseMsgクリア漏れ修正を統合。

- [ ] **Step 1: import追加 + state追加**

```tsx
// 既存importの後に追加:
import Stepper from './Stepper';
import ProgressBar from './ProgressBar';
import ToastComponent, { type ToastItem } from './Toast';
import OdLogForm from './OdLogForm';
import { cancelIntake } from '../api/intakes';

// 既存stateの後に追加:
const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
const [toasts, setToasts] = useState<ToastItem[]>([]);
const [showOdForm, setShowOdForm] = useState(false);
const [fetchError, setFetchError] = useState('');
```

- [ ] **Step 2: useEffect にエラーハンドリング追加**

```tsx
// 既存のPromise.all を try-catch で囲む:
try {
  const [medsData, intakesData] = await Promise.all([...]);
  // 既存処理
} catch {
  setFetchError(t('home.fetchError' as any, lang));
} finally {
  setLoading(false);
}
```

- [ ] **Step 3: handleTake を修正（ダブルタップ防止 + overdoseMsgクリア + Toast）**

```tsx
async function handleTake(med: Medication) {
  if (submitting[med.id]) return;
  setSubmitting(prev => ({ ...prev, [med.id]: true }));
  setOverdoseMsg('');  // B-2 修正
  setTakeError('');
  try {
    const takenUnits = units[med.id] ?? 1;
    const result = await createIntake(med.id, takenUnits);
    // state更新
    const newIntake = {
      id: result.intakeId, medicationId: med.id,
      medicationName: med.name, takenUnits,
      limitPerDaySnapshot: med.limitPerDay,
      takenAt: new Date().toISOString(),
      dateKey: result.dateKey, isOverdose: result.isOverdose,
      totalToday: result.totalToday, cancelled: false,
      isOdLog: false, moodTags: [] as string[], memo: '',
    };
    setTodayIntakes(prev => [...prev, newIntake]);
    // todayTotals も更新
    setTodayTotals(prev => ({ ...prev, [med.id]: result.totalToday }));
    // Toast表示
    const toastId = result.intakeId;
    setToasts(prev => [...prev, {
      id: toastId,
      message: t('toast.recorded' as any, lang).replace('{name}', med.name),
      undoLabel: t('toast.undo' as any, lang),
      onUndo: async () => {
        await cancelIntake(toastId);
        setTodayIntakes(prev => prev.filter(i => i.id !== toastId));
        // 取り消し後に todayTotals を再計算
        setTodayTotals(prev => ({
          ...prev,
          [med.id]: Math.max(0, (prev[med.id] ?? 0) - takenUnits),
        }));
        setToasts(prev => prev.filter(t => t.id !== toastId));
      },
    }]);
    if (result.isOverdose) {
      setOverdoseMsg(t('overdose.message', lang));
    }
  } catch { setTakeError(t('toast.error' as any, lang)); }
  finally { setSubmitting(prev => ({ ...prev, [med.id]: false })); }
}
```

- [ ] **Step 4: number input をステッパーに置換、累計表示をプログレスバーに**

```tsx
// 既存の <input type="number"> を置換:
<Stepper
  value={units[med.id] ?? 1}
  onChange={v => setUnits(prev => ({ ...prev, [med.id]: v }))}
  min={1}
  max={med.limitPerDay}
  unit={t('home.units', lang)}
/>

// 既存の text-xs text-gray-400 累計表示を置換:
<ProgressBar
  current={todayTotals[med.id] ?? 0}
  max={med.limitPerDay}
  unit={t('home.units', lang)}
/>
```

- [ ] **Step 5: 飲んだボタン拡大 + disabled**

```tsx
<button
  onClick={() => handleTake(med)}
  disabled={submitting[med.id]}
  className="ml-auto bg-amber-400 hover:bg-amber-500 text-white px-5 py-3 rounded-lg text-base font-medium disabled:opacity-50"
>
  {submitting[med.id] ? '...' : t('home.take', lang)}
</button>
```

- [ ] **Step 6: 完了表示 + OD記録ボタン + Toast配置**

```tsx
// 薬一覧の上に完了表示:
{meds.length > 0 && meds.every(m => (todayTotals[m.id] ?? 0) >= m.limitPerDay) && (
  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
    <p className="text-green-700 font-medium">{t('home.allComplete' as any, lang)}</p>
  </div>
)}

// 薬一覧の下にODボタン:
{meds.length > 0 && !showOdForm && (
  <button onClick={() => setShowOdForm(true)}
    className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl text-sm">
    {t('od.button' as any, lang)}
  </button>
)}
{showOdForm && (
  <OdLogForm
    medications={meds}
    onSuccess={(result) => {
      setShowOdForm(false);
      setToasts(prev => [...prev, {
        id: result.intakeId,
        message: t('od.successMessage' as any, lang),
      }]);
    }}
    onCancel={() => setShowOdForm(false)}
  />
)}

// 最下部にToast:
<ToastComponent items={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
```

- [ ] **Step 7: コミット**

```bash
git add src/components/IntakeForm.tsx
git commit -m "feat: IntakeForm 全面改修（ステッパー、Toast、OD、プログレスバー、ダブルタップ防止）"
```

---

## Task 13: MedicationForm + MedicationList + LogList 改修（Med-UI）

**Files:**
- Modify: `src/components/MedicationForm.tsx`
- Modify: `src/components/MedicationList.tsx`
- Modify: `src/components/LogList.tsx`

- [ ] **Step 1: MedicationForm.tsx に通知設定UI追加**

通知ON/OFFトグル + 時刻プルダウン追加。`<select>` で00:00〜23:00。

- [ ] **Step 2: MedicationList.tsx エラーハンドリング改善**

handleDelete を try-catch で囲む。

- [ ] **Step 3: LogList.tsx の OD記録区別表示 + i18n修正**

- `isOdLog: true` の記録に薄いパープル左ボーダー + 気分タグチップ + メモ表示
- ハードコードの日本語を `t()` に置き換え

- [ ] **Step 4: コミット**

```bash
git add src/components/MedicationForm.tsx src/components/MedicationList.tsx src/components/LogList.tsx
git commit -m "feat: MedicationForm通知UI、MedicationListエラー処理、LogList OD表示"
```

---

## Task 14: LandingPage + ページ統合（Med-UI）

**Files:**
- Create: `src/components/LandingPage.tsx`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/medications.astro`
- Modify: `src/pages/logs.astro`

- [ ] **Step 1: LandingPage.tsx 作成**

パステルカラーのスクロール型LP。ヒーロー + 特徴3カード + 使い方3ステップ + CTA。

- [ ] **Step 2: index.astro で認証状態によりLP/ホームを出し分け**

```astro
<!-- src/pages/index.astro -->
<LandingPage client:only="react" />
```

LandingPage 内で `onAuthStateChanged` をリッスンし、認証済みなら AppLayout + IntakeForm、未認証ならLPを表示。

- [ ] **Step 3: medications.astro と logs.astro に AppLayout 適用**

各ページで既存の TabNav import を削除し、AppLayout で囲む。例:

```astro
<!-- src/pages/medications.astro -->
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="薬リスト">
  <!-- TabNav を削除し、MedicationPageWrapper を AppLayout で囲む -->
  <MedicationPageWrapper client:only="react" />
</Layout>
```

MedicationPageWrapper 内で AppLayout を使用:
```tsx
// MedicationPageWrapper は AppLayout で MedicationList + MedicationForm を囲む
<AppLayout active="medications">
  <MedicationList ... />
  <MedicationForm ... />
</AppLayout>
```

logs.astro も同様に AppLayout active="logs" で囲む。

- [ ] **Step 4: コミット**

```bash
git add src/components/LandingPage.tsx src/pages/index.astro src/pages/medications.astro src/pages/logs.astro
git commit -m "feat: LP追加、全ページ AppLayout 適用"
```

---

## Task 15: ユニットテスト拡充（Med-Test）

**Files:**
- Modify: `functions/src/tests/intakes.test.ts`
- Modify: `functions/src/tests/auth.test.ts`
- Modify: `functions/src/tests/medications.test.ts`

- [ ] **Step 1: intakes.test.ts に calcOverdose 追加テスト**

```typescript
test('既に上限到達後の追加記録', () => {
  const result = calcOverdose(3, 1, 3);
  expect(result.isOverdose).toBe(true);
  expect(result.totalToday).toBe(4);
});

test('大きな数値', () => {
  const result = calcOverdose(999999, 1, 1000000);
  expect(result.isOverdose).toBe(false);
  expect(result.totalToday).toBe(1000000);
});
```

- [ ] **Step 2: auth.test.ts に追加テスト**

```typescript
test('Bearer以外のスキーム → 401', async () => { /* ... */ });
test('空トークン → 401', async () => { /* ... */ });
```

- [ ] **Step 3: テスト実行**

Run: `cd functions && npm test`
Expected: 全テスト PASS

- [ ] **Step 4: コミット**

```bash
git add functions/src/tests/
git commit -m "test: ユニットテスト拡充（calcOverdose追加ケース、auth追加ケース）"
```

---

## Task 16: 統合テスト（Med-Test）

**Files:**
- Create: `functions/src/tests/intakes-integration.test.ts`
- Create: `functions/src/tests/medications-integration.test.ts`

Firebase Emulator を使った統合テスト。

- [ ] **Step 1: intakes-integration.test.ts 作成**

POST /v1/intakes の正常系、過量系、OD記録系、バリデーションエラー系。
PATCH /v1/intakes/:id の正常取り消し、403、既取り消し、404。

- [ ] **Step 2: medications-integration.test.ts 作成**

POST バリデーション（空文字、101文字、limitPerDay=0/100/1.5）。
PUT 部分更新、通知フィールド。
DELETE 正常、403。

- [ ] **Step 3: テスト実行**

Run: `cd functions && npm test`

- [ ] **Step 4: コミット**

```bash
git add functions/src/tests/
git commit -m "test: 統合テスト追加（intakes、medications）"
```

---

## Task 17: 設定・インフラ修正（Config）

**Files:**
- Modify: `firebase.json`
- Modify: `astro.config.mjs`
- Create: `firestore.indexes.json`

このタスクは他タスクと並列実行可能。

- [ ] **Step 1: firebase.json 修正**

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": { /* 既存のまま */ },
  "emulators": { /* 既存のまま */ }
}
```

注意: `rewrites` セクションを削除する。

- [ ] **Step 2: astro.config.mjs 修正**

manifest に `display: 'standalone'`, `start_url`, `background_color` 追加。
workbox.runtimeCaching 追加。

- [ ] **Step 3: firestore.indexes.json 作成**

設計書セクション6.5の内容をそのまま使用。

- [ ] **Step 4: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 5: コミット**

```bash
git add firebase.json astro.config.mjs firestore.indexes.json
git commit -m "feat: firebase設定修正、PWA manifest改善、Firestoreインデックス追加"
```

---

## 実行順序サマリー

```
並列グループ A（同時実行可）:
  Task 17: Config（誰でも）
  Task 1-6: Med-API
  Task 7-11: Med-UI（共有コンポーネント + API クライアント）

依存グループ B（グループA完了後）:
  Task 12-14: Med-UI（ページ統合 — APIクライアントとコンポーネントに依存）

依存グループ C（Task 1-6 完了後）:
  Task 15-16: Med-Test
```

## 未対応・延期項目

| 項目 | 理由 |
|---|---|
| C-4 App Check / レート制限 | MVP段階では過剰。将来的に Firebase App Check 導入予定。設計書に記載あり |
| MedicationList の編集/削除ボタンのタッチターゲット拡大 (C-8) | Task 13 で MedicationList を触る際に `p-2` 以上に拡大すること |
| 言語切替ボタンのタッチターゲット (C-8) | Task 12 で IntakeForm 改修時に `px-3 py-2` に拡大すること |
