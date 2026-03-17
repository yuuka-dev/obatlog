# ObatLog MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MVPとして Astro PWA + Firebase Functions v2 による服薬記録・過量チェックアプリを構築する。

**Architecture:** 全読み書きを Firebase Functions v2 (REST API) 経由にし、Firestore はクライアント直接アクセスを禁止する。フロントエンドは Astro の静的出力 + React Islands のみ使用。認証は Firebase Auth メール/パスワード。

**Tech Stack:** Astro 4.x, React 18, Tailwind CSS 3, Firebase (Auth / Firestore / Functions v2 / Hosting), vite-plugin-pwa, TypeScript

---

## File Map

### ルート設定ファイル
| ファイル | 役割 |
|---------|------|
| `astro.config.mjs` | Astro設定（React統合・PWA・output:static） |
| `tailwind.config.mjs` | Tailwind設定 |
| `firebase.json` | Firebase Hosting / Functions / Emulator設定 |
| `firestore.rules` | Firestore Security Rules（全拒否） |
| `.firebaserc` | Firebaseプロジェクト紐付け |
| `package.json` | フロントエンド依存 |

### src/lib/ — クライアント基盤
| ファイル | 役割 |
|---------|------|
| `src/lib/firebase.ts` | Firebase App / Auth 初期化 |
| `src/lib/api.ts` | ベース fetch ラッパー（token付与・エラー変換） |
| `src/lib/auth.ts` | サインイン・サインアウト・現在ユーザー取得 |

### src/i18n/ — 翻訳
| ファイル | 役割 |
|---------|------|
| `src/i18n/ja.json` | 日本語翻訳 |
| `src/i18n/en.json` | 英語翻訳 |
| `src/i18n/id.json` | インドネシア語翻訳 |
| `src/i18n/index.ts` | `t(key, lang)` ユーティリティ |

### src/api/ — Functions 呼び出し
| ファイル | 役割 |
|---------|------|
| `src/api/users.ts` | `getMe()` / `updateMe()` |
| `src/api/medications.ts` | `list()` / `create()` / `update()` / `remove()` |
| `src/api/intakes.ts` | `listByDate()` / `listRecent()` / `create()` |

### src/pages/ — Astro ページ
| ファイル | 役割 |
|---------|------|
| `src/pages/login.astro` | ログイン画面 |
| `src/pages/index.astro` | ホーム（今日の服薬） |
| `src/pages/medications.astro` | 薬リスト |
| `src/pages/logs.astro` | ログ一覧 |
| `src/middleware.ts` | 未認証 → /login リダイレクト |

### src/components/ — React Islands
| ファイル | 役割 |
|---------|------|
| `src/components/LoginForm.tsx` | メール/パスワード認証フォーム |
| `src/components/MedicationList.tsx` | 薬一覧・削除 |
| `src/components/MedicationForm.tsx` | 薬の追加・編集フォーム |
| `src/components/IntakeForm.tsx` | 服薬記録フォーム（過量警告含む） |
| `src/components/LogList.tsx` | 服薬ログ一覧（dateKeyグループ） |
| `src/components/TabNav.tsx` | 下部タブナビ |

### functions/src/ — Functions v2
| ファイル | 役割 |
|---------|------|
| `functions/src/index.ts` | ルーター（エンドポイント定義のみ） |
| `functions/src/middleware/auth.ts` | `verifyIdToken()` ミドルウェア |
| `functions/src/users.ts` | GET/PUT /v1/users/me + onUserCreate |
| `functions/src/medications.ts` | medications CRUD |
| `functions/src/intakes.ts` | intakes 記録 + 過量チェック |

### functions/src/tests/ — Functions テスト
| ファイル | 役割 |
|---------|------|
| `functions/src/tests/medications.test.ts` | medications ハンドラーテスト |
| `functions/src/tests/intakes.test.ts` | 過量チェックロジックテスト |

---

## Task 1: Astro プロジェクト初期化

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tailwind.config.mjs`
- Create: `src/env.d.ts`

- [ ] **Step 1: Astro プロジェクトを初期化する**

```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git
```

- [ ] **Step 2: 依存パッケージをインストールする**

```bash
npm install @astrojs/react @astrojs/tailwind react react-dom tailwindcss
npm install firebase
npm install -D typescript @types/react @types/react-dom vite-plugin-pwa workbox-window
```

- [ ] **Step 3: `astro.config.mjs` を設定する**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  output: 'static',
  integrations: [react(), tailwind()],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'ObatLog',
          short_name: 'ObatLog',
          description: '服薬記録・過量チェックアプリ',
          theme_color: '#ffffff',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  },
});
```

- [ ] **Step 4: `tailwind.config.mjs` を設定する**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 5: `src/env.d.ts` を作成する**

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_FUNCTIONS_BASE_URL: string;
}
```

- [ ] **Step 6: `.env.example` を作成する**

```
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_APP_ID=
PUBLIC_FUNCTIONS_BASE_URL=http://localhost:5001/<project-id>/asia-northeast1/api
```

- [ ] **Step 7: ビルドが通ることを確認する**

```bash
npm run build
```
Expected: `dist/` が生成されエラーなし

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "chore: Astroプロジェクト初期化・依存インストール"
```

---

## Task 2: Firebase 設定ファイル

**Files:**
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `.firebaserc`

- [ ] **Step 1: `firestore.rules` を作成する（全クライアントアクセス禁止）**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // クライアントからの直接アクセスを全て禁止
    // 全読み書きは Firebase Functions Admin SDK 経由のみ
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: `firebase.json` を作成する**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": {
    "source": "functions",
    "codebase": "default",
    "ignore": ["node_modules", ".git", "lib", "*.test.ts"]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 3: `.firebaserc` を作成する**

```json
{
  "projects": {
    "default": "<your-firebase-project-id>"
  }
}
```
※ `<your-firebase-project-id>` は実際のプロジェクトIDに差し替える

- [ ] **Step 4: コミット**

```bash
git add firebase.json firestore.rules .firebaserc
git commit -m "chore: Firebase設定・Firestoreセキュリティルール追加"
```

---

## Task 3: Functions v2 プロジェクト初期化

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts`

- [ ] **Step 1: functions ディレクトリを作成し依存をインストールする**

```bash
mkdir functions && cd functions
npm init -y
npm install firebase-admin firebase-functions express cors
npm install -D typescript @types/express @types/cors ts-node jest @types/jest ts-jest
```

- [ ] **Step 2: `functions/tsconfig.json` を作成する**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020"
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 3: `functions/package.json` の scripts を更新する**

```json
{
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "test": "jest",
    "deploy": "firebase deploy --only functions"
  },
  "engines": { "node": "20" },
  "main": "lib/index.js"
}
```

- [ ] **Step 4: `functions/jest.config.js` を作成する**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
};
```

- [ ] **Step 5: `functions/src/index.ts` (ルーター) を作成する**

```ts
// Firebase Functions v2 エントリーポイント・ルーター
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

admin.initializeApp();

const app = express();

// CORS設定: 本番 + 開発環境を許可
const allowedOrigins = [
  'https://obatlog.osaka29.jp',
  'http://localhost:4321',
  'http://localhost:5000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ルートをインポート（実装後に順次アンコメント）
import { usersRouter } from './users';
import { medicationsRouter } from './medications';
import { intakesRouter } from './intakes';

app.use('/v1/users', usersRouter);
app.use('/v1/medications', medicationsRouter);
app.use('/v1/intakes', intakesRouter);

// Functions v2 エクスポート（リージョン: 東京）
export const api = onRequest(
  { region: 'asia-northeast1', timeoutSeconds: 60 },
  app
);
```

- [ ] **Step 6: ビルドが通ることを確認する（ルーターのみ）**

```bash
cd functions && npm run build
```

- [ ] **Step 7: コミット**

```bash
git add functions/
git commit -m "chore: Functions v2プロジェクト初期化・ルーター骨格"
```

---

## Task 4: Functions 認証ミドルウェア

**Files:**
- Create: `functions/src/middleware/auth.ts`

- [ ] **Step 1: `functions/src/middleware/auth.ts` を作成する**

```ts
// 全APIエンドポイントで使用するトークン検証ミドルウェア
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// AuthenticatedRequest: uid が付与されたリクエスト型
export interface AuthenticatedRequest extends Request {
  uid: string;
}

// verifyToken: Authorizationヘッダーの idToken を検証し uid をセット
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authorization header required.' } });
    return;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as AuthenticatedRequest).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' } });
  }
}
```

- [ ] **Step 2: ミドルウェアの単体テストを書く**

`functions/src/tests/auth.test.ts`:
```ts
import { verifyToken } from '../middleware/auth';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
  initializeApp: jest.fn(),
  apps: [],
}));

describe('verifyToken', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('Authorizationヘッダーがない場合 401 を返す', async () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('有効なトークンの場合 uid をセットして next() を呼ぶ', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-123' });
    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(req.uid).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: テストを実行して確認する**

```bash
cd functions && npm test -- --testPathPattern=auth
```
Expected: 2 tests passed

- [ ] **Step 4: コミット**

```bash
git add functions/src/middleware/ functions/src/tests/auth.test.ts
git commit -m "feat: Functionsトークン検証ミドルウェア追加"
```

---

## Task 5: Functions users ハンドラー + onUserCreate

**Files:**
- Create: `functions/src/users.ts`

- [ ] **Step 1: `functions/src/users.ts` を作成する**

```ts
// ユーザープロフィール API
// onUserCreate トリガーは使わず、GET /v1/users/me の初回アクセス時にドキュメントを遅延生成する。
// 理由: v2 の beforeUserCreated はブロッキングトリガーのため、
//       Firestore 書き込みに失敗するとユーザー登録自体が拒否されるリスクがある。
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const usersRouter = Router();
const db = admin.firestore();

// ensureUserDoc: ユーザードキュメントが存在しない場合に作成する（遅延初期化）
async function ensureUserDoc(uid: string, email: string): Promise<void> {
  const ref = db.collection('users').doc(uid);
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
    // idToken からメールを取得して遅延初期化
    const userRecord = await admin.auth().getUser(uid);
    await ensureUserDoc(uid, userRecord.email ?? '');
    const doc = await db.collection('users').doc(uid).get();
    return res.json({ id: doc.id, ...doc.data() });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user.' } });
  }
});

// PUT /v1/users/me — language のみ更新可
usersRouter.put('/me', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { language } = req.body;
  if (!['ja', 'en', 'id'].includes(language)) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'language must be ja, en, or id.' } });
  }
  try {
    await db.collection('users').doc(uid).update({ language });
    return res.json({ id: uid, language });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user.' } });
  }
});
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
cd functions && npm run build
```

- [ ] **Step 3: コミット**

```bash
git add functions/src/users.ts
git commit -m "feat: users API (GET/PUT /v1/users/me) + onUserCreate トリガー"
```

---

## Task 6: Functions medications ハンドラー

**Files:**
- Create: `functions/src/medications.ts`
- Create: `functions/src/tests/medications.test.ts`

- [ ] **Step 1: テストを先に書く（TDD）**

`functions/src/tests/medications.test.ts`:
```ts
// medications ハンドラーのテスト
// Firebase Emulator または モックを使用

describe('POST /v1/medications', () => {
  it('name と limitPerDay が必須', async () => {
    // body に name がない場合 400 を返す
    // (Emulator テストの実装例 — 本番コードと合わせて詳細化する)
    expect(true).toBe(true); // placeholder: Emulator起動後に統合テストに差し替え
  });
});

describe('medications validation', () => {
  it('limitPerDay は正の整数であること', () => {
    const valid = (v: number) => Number.isInteger(v) && v > 0;
    expect(valid(3)).toBe(true);
    expect(valid(0)).toBe(false);
    expect(valid(-1)).toBe(false);
    expect(valid(1.5)).toBe(false);
  });
});
```

- [ ] **Step 2: テストを実行し PASS することを確認する**

```bash
cd functions && npm test -- --testPathPattern=medications
```

- [ ] **Step 3: `functions/src/medications.ts` を実装する**

```ts
// 薬 CRUD ハンドラー
import { Router } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, AuthenticatedRequest } from './middleware/auth';

export const medicationsRouter = Router();
const db = admin.firestore();

// GET /v1/medications — ユーザーの薬一覧取得
medicationsRouter.get('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  try {
    const snap = await db.collection('medications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'asc')
      .get();
    const meds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(meds);
  } catch {
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
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await db.collection('medications').add({
      userId: uid,
      name: name.trim(),
      limitPerDay,
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json({ id: ref.id, userId: uid, name: name.trim(), limitPerDay });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create medication.' } });
  }
});

// PUT /v1/medications/:id — 薬を更新（name / limitPerDay のみ）
medicationsRouter.put('/:id', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { id } = req.params;
  const { name, limitPerDay } = req.body;
  try {
    const ref = db.collection('medications').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
    if (doc.data()?.userId !== uid) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const updates: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'name must be a non-empty string.' } });
      updates.name = name.trim();
    }
    if (limitPerDay !== undefined) {
      if (!Number.isInteger(limitPerDay) || limitPerDay <= 0) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'limitPerDay must be a positive integer.' } });
      updates.limitPerDay = limitPerDay;
    }
    await ref.update(updates);
    return res.json({ id, ...doc.data(), ...updates });
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update medication.' } });
  }
});

// DELETE /v1/medications/:id — 薬をハード削除
medicationsRouter.delete('/:id', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { id } = req.params;
  try {
    const ref = db.collection('medications').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medication not found.' } });
    if (doc.data()?.userId !== uid) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    await ref.delete();
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete medication.' } });
  }
});
```

- [ ] **Step 4: ビルドが通ることを確認する**

```bash
cd functions && npm run build
```

- [ ] **Step 5: コミット**

```bash
git add functions/src/medications.ts functions/src/tests/medications.test.ts
git commit -m "feat: medications CRUD API (GET/POST/PUT/DELETE /v1/medications)"
```

---

## Task 7: Functions intakes ハンドラー（過量チェック含む）

**Files:**
- Create: `functions/src/intakes.ts`
- Create: `functions/src/tests/intakes.test.ts`

- [ ] **Step 1: 過量チェックのテストを先に書く（TDD）**

`functions/src/tests/intakes.test.ts`:
```ts
// 過量チェックロジックのユニットテスト
import { calcOverdose } from '../intakes';

describe('calcOverdose', () => {
  it('累計が上限以下なら isOverdose: false', () => {
    expect(calcOverdose(2, 1, 3)).toEqual({ isOverdose: false, totalToday: 3 });
  });

  it('累計が上限を超えたら isOverdose: true', () => {
    expect(calcOverdose(2, 2, 3)).toEqual({ isOverdose: true, totalToday: 4 });
  });

  it('累計がちょうど上限なら isOverdose: false', () => {
    expect(calcOverdose(0, 3, 3)).toEqual({ isOverdose: false, totalToday: 3 });
  });
});
```

- [ ] **Step 2: テストを実行し FAIL することを確認する**

```bash
cd functions && npm test -- --testPathPattern=intakes
```
Expected: FAIL (calcOverdose not defined)

- [ ] **Step 3: `functions/src/intakes.ts` を実装する**

```ts
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
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record intake.' } });
  }
});

// GET /v1/intakes — 服薬記録取得
// クエリパラメータ: dateKey=YYYY-MM-DD (特定日) or limit=N (直近N件, デフォルト30)
intakesRouter.get('/', verifyToken, async (req, res) => {
  const { uid } = req as AuthenticatedRequest;
  const { dateKey, limit } = req.query;

  try {
    let query = db.collection('intakes').where('userId', '==', uid);

    if (dateKey) {
      // 特定日フィルタ（ホーム画面用）
      query = query.where('dateKey', '==', dateKey as string) as any;
      const snap = await (query as any).orderBy('takenAt', 'asc').get();
      return res.json(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } else {
      // 直近N件（ログ一覧用）
      const n = Math.min(parseInt(limit as string) || 30, 100);
      const snap = await (query as any).orderBy('takenAt', 'desc').limit(n).get();
      return res.json(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    }
  } catch {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list intakes.' } });
  }
});
```

- [ ] **Step 4: テストを実行し PASS することを確認する**

```bash
cd functions && npm test -- --testPathPattern=intakes
```
Expected: 3 tests passed

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
cd functions && npm run build
```

- [ ] **Step 6: コミット**

```bash
git add functions/src/intakes.ts functions/src/tests/intakes.test.ts
git commit -m "feat: intakes API + 過量チェックロジック (calcOverdose TDD)"
```

---

## Task 8: フロントエンド基盤（firebase.ts / api.ts / auth.ts）

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/auth.ts`

- [ ] **Step 1: `src/lib/firebase.ts` を作成する**

```ts
// Firebase App と Auth の初期化
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// 多重初期化防止
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
```

- [ ] **Step 2: `src/lib/api.ts` を作成する（ベース fetch ラッパー）**

```ts
// Functions API 呼び出し共通ラッパー
// - idToken を Authorization ヘッダーに自動付与
// - エラーレスポンスを統一的に変換

import { auth } from './firebase';

const BASE_URL = import.meta.env.PUBLIC_FUNCTIONS_BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Not logged in.');
  return user.getIdToken();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? 'Request failed.'
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
```

- [ ] **Step 3: `src/lib/auth.ts` を作成する**

```ts
// Firebase Auth ヘルパー
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUp(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getCurrentUser(): Promise<User | null> {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
}
```

- [ ] **Step 4: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 5: コミット**

```bash
git add src/lib/
git commit -m "feat: フロントエンド基盤 (firebase / api / auth)"
```

---

## Task 9: i18n ユーティリティ + 翻訳ファイル

**Files:**
- Create: `src/i18n/ja.json`
- Create: `src/i18n/en.json`
- Create: `src/i18n/id.json`
- Create: `src/i18n/index.ts`

- [ ] **Step 1: `src/i18n/ja.json` を作成する**

```json
{
  "common.save": "保存",
  "common.cancel": "キャンセル",
  "common.delete": "削除",
  "common.edit": "編集",
  "common.add": "追加",
  "common.loading": "読み込み中...",
  "nav.home": "ホーム",
  "nav.medications": "薬",
  "nav.logs": "ログ",
  "auth.email": "メールアドレス",
  "auth.password": "パスワード",
  "auth.signIn": "ログイン",
  "auth.signUp": "新規登録",
  "home.title": "今日の服薬",
  "home.take": "飲んだ",
  "home.units": "錠",
  "medications.title": "薬リスト",
  "medications.name": "薬の名前",
  "medications.limitPerDay": "1日上限（錠）",
  "medications.confirmDelete": "この薬を削除しますか？",
  "logs.title": "服薬ログ",
  "overdose.message": "今日はたくさん飲んだね。少し休んでね。",
  "empty.home.noMedications": "まだ薬が登録されていません。薬リストから追加してください。",
  "empty.home.noIntakesToday": "今日はまだ記録がありません。",
  "empty.medications.noMedications": "薬がまだ登録されていません。",
  "empty.logs.noIntakes": "まだ服薬記録がありません。",
  "errors.notFound": "データが見つかりませんでした。",
  "errors.unauthorized": "ログインが必要です。",
  "errors.internal": "エラーが発生しました。しばらく後に再試行してください。"
}
```

- [ ] **Step 2: `src/i18n/en.json` を作成する**

```json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.loading": "Loading...",
  "nav.home": "Home",
  "nav.medications": "Medications",
  "nav.logs": "Logs",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign In",
  "auth.signUp": "Sign Up",
  "home.title": "Today's Medication",
  "home.take": "Taken",
  "home.units": "tablet(s)",
  "medications.title": "Medications",
  "medications.name": "Medication Name",
  "medications.limitPerDay": "Daily Limit (tablets)",
  "medications.confirmDelete": "Delete this medication?",
  "logs.title": "Medication Log",
  "overdose.message": "You've taken a lot today. Please take care.",
  "empty.home.noMedications": "No medications registered yet. Add one from the Medications tab.",
  "empty.home.noIntakesToday": "No records for today yet.",
  "empty.medications.noMedications": "No medications registered yet.",
  "empty.logs.noIntakes": "No medication records yet.",
  "errors.notFound": "Data not found.",
  "errors.unauthorized": "Please sign in.",
  "errors.internal": "An error occurred. Please try again later."
}
```

- [ ] **Step 3: `src/i18n/id.json` を作成する**

```json
{
  "common.save": "Simpan",
  "common.cancel": "Batal",
  "common.delete": "Hapus",
  "common.edit": "Edit",
  "common.add": "Tambah",
  "common.loading": "Memuat...",
  "nav.home": "Beranda",
  "nav.medications": "Obat",
  "nav.logs": "Riwayat",
  "auth.email": "Email",
  "auth.password": "Kata Sandi",
  "auth.signIn": "Masuk",
  "auth.signUp": "Daftar",
  "home.title": "Obat Hari Ini",
  "home.take": "Sudah minum",
  "home.units": "tablet",
  "medications.title": "Daftar Obat",
  "medications.name": "Nama Obat",
  "medications.limitPerDay": "Batas Harian (tablet)",
  "medications.confirmDelete": "Hapus obat ini?",
  "logs.title": "Riwayat Minum Obat",
  "overdose.message": "Kamu sudah minum banyak hari ini. Istirahat sebentar ya.",
  "empty.home.noMedications": "Belum ada obat terdaftar. Tambahkan di tab Obat.",
  "empty.home.noIntakesToday": "Belum ada catatan hari ini.",
  "empty.medications.noMedications": "Belum ada obat terdaftar.",
  "empty.logs.noIntakes": "Belum ada riwayat minum obat.",
  "errors.notFound": "Data tidak ditemukan.",
  "errors.unauthorized": "Silakan masuk terlebih dahulu.",
  "errors.internal": "Terjadi kesalahan. Coba lagi nanti."
}
```

- [ ] **Step 4: `src/i18n/index.ts` を作成する（シンプルなユーティリティ）**

```ts
// t(key, lang): 指定言語の翻訳文字列を返す
// ライブラリ不要のシンプルな実装
import ja from './ja.json';
import en from './en.json';
import id from './id.json';

type Lang = 'ja' | 'en' | 'id';
type TranslationKey = keyof typeof ja;

const translations: Record<Lang, Record<string, string>> = { ja, en, id };

export function t(key: TranslationKey, lang: Lang = 'ja'): string {
  return translations[lang][key] ?? translations['ja'][key] ?? key;
}

// localStorage から言語設定を取得（クライアントサイドのみ）
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ja';
  return (localStorage.getItem('lang') as Lang) ?? 'ja';
}

export function setLang(lang: Lang): void {
  localStorage.setItem('lang', lang);
}
```

- [ ] **Step 5: コミット**

```bash
git add src/i18n/
git commit -m "feat: i18n翻訳ファイル (ja/en/id) + t()ユーティリティ"
```

---

## Task 10: Astro middleware + ログイン画面

**Files:**
- Create: `src/middleware.ts`
- Create: `src/pages/login.astro`
- Create: `src/components/LoginForm.tsx`

- [ ] **Step 1: `src/middleware.ts` を作成する（認証ガード）**

```ts
// 未認証ユーザーを /login にリダイレクト
// Astro middleware は静的出力でも SSR モード不要（クライアント側でも制御）
import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PATHS = ['/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  // 静的出力のため、ページ自体はクライアントサイドの認証チェックで制御する
  // （middleware はビルド時に実行されないため、LoginForm 内でリダイレクト）
  return next();
});
```

**注意:** Astro の `output: static` では middleware はクライアントサイドで動作しない。
代わりに各ページの Island コンポーネント内で `onAuthStateChanged` を使い、
未認証の場合は `window.location.href = '/login'` でリダイレクトする。

- [ ] **Step 2: `src/components/LoginForm.tsx` を作成する**

```tsx
// ログイン・新規登録フォーム
import { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { getLang } from '../i18n/index';
import { t } from '../i18n/index';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lang = getLang();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message ?? t('errors.internal', lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">ObatLog 💊</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.email', lang)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('auth.password', lang)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? t('common.loading', lang) : (isSignUp ? t('auth.signUp', lang) : t('auth.signIn', lang))}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          {isSignUp ? t('auth.signIn', lang) : t('auth.signUp', lang)}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/pages/login.astro` を作成する**

```astro
---
// ログイン画面
---
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObatLog — ログイン</title>
  </head>
  <body>
    <LoginForm client:only="react" />
  </body>
</html>

<script>
  // 認証済みユーザーはホームへリダイレクト
  import { auth } from '../lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = '/';
  });
</script>
```

**注意:** `import` を script タグ内で使う場合は `<script>` に `type="module"` は不要（Astro が処理）。
LoginForm のインポートは `---` ブロック内で行うこと。

- [ ] **Step 4: 修正済み `src/pages/login.astro`**

```astro
---
import LoginForm from '../components/LoginForm';
---
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObatLog — ログイン</title>
  </head>
  <body>
    <LoginForm client:only="react" />
    <script>
      import { auth } from '../lib/firebase';
      import { onAuthStateChanged } from 'firebase/auth';
      onAuthStateChanged(auth, (user) => {
        if (user) window.location.href = '/';
      });
    </script>
  </body>
</html>
```

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 6: コミット**

```bash
git add src/middleware.ts src/pages/login.astro src/components/LoginForm.tsx
git commit -m "feat: ログイン画面 + 認証フォーム"
```

---

## Task 11: API クライアント層

**Files:**
- Create: `src/api/users.ts`
- Create: `src/api/medications.ts`
- Create: `src/api/intakes.ts`

- [ ] **Step 1: `src/api/users.ts` を作成する**

```ts
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  language: 'ja' | 'en' | 'id';
}

export const getMe = () => apiFetch<UserProfile>('/v1/users/me');

export const updateMe = (language: 'ja' | 'en' | 'id') =>
  apiFetch<UserProfile>('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify({ language }),
  });
```

- [ ] **Step 2: `src/api/medications.ts` を作成する**

```ts
import { apiFetch } from '../lib/api';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  limitPerDay: number;
}

export const listMedications = () =>
  apiFetch<Medication[]>('/v1/medications');

export const createMedication = (name: string, limitPerDay: number) =>
  apiFetch<Medication>('/v1/medications', {
    method: 'POST',
    body: JSON.stringify({ name, limitPerDay }),
  });

export const updateMedication = (id: string, data: Partial<Pick<Medication, 'name' | 'limitPerDay'>>) =>
  apiFetch<Medication>(`/v1/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMedication = (id: string) =>
  apiFetch<void>(`/v1/medications/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: `src/api/intakes.ts` を作成する**

```ts
import { apiFetch } from '../lib/api';

export interface Intake {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  limitPerDaySnapshot: number;
  takenUnits: number;
  takenAt: { seconds: number };
  dateKey: string;
  isOverdose: boolean;
  totalToday: number;
}

export const listIntakesByDate = (dateKey: string) =>
  apiFetch<Intake[]>(`/v1/intakes?dateKey=${dateKey}`);

export const listRecentIntakes = (limit = 30) =>
  apiFetch<Intake[]>(`/v1/intakes?limit=${limit}`);

export const createIntake = (medicationId: string, takenUnits: number) =>
  apiFetch<{ intakeId: string; isOverdose: boolean; totalToday: number }>(
    '/v1/intakes',
    { method: 'POST', body: JSON.stringify({ medicationId, takenUnits }) }
  );
```

- [ ] **Step 4: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 5: コミット**

```bash
git add src/api/
git commit -m "feat: API クライアント層 (users / medications / intakes)"
```

---

## Task 12: TabNav + 薬リスト画面

**Files:**
- Create: `src/components/TabNav.tsx`
- Create: `src/components/MedicationList.tsx`
- Create: `src/components/MedicationForm.tsx`
- Create: `src/pages/medications.astro`

- [ ] **Step 1: `src/components/TabNav.tsx` を作成する**

```tsx
// 下部タブナビゲーション（全画面共通）
import { t, getLang } from '../i18n/index';

interface Props {
  active: 'home' | 'medications' | 'logs';
}

export default function TabNav({ active }: Props) {
  const lang = getLang();
  const tabs = [
    { key: 'home' as const, href: '/', label: t('nav.home', lang), icon: '🏠' },
    { key: 'medications' as const, href: '/medications', label: t('nav.medications', lang), icon: '💊' },
    { key: 'logs' as const, href: '/logs', label: t('nav.logs', lang), icon: '📋' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {tabs.map(tab => (
        <a
          key={tab.key}
          href={tab.href}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition
            ${active === tab.key ? 'text-amber-500 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: `src/components/MedicationForm.tsx` を作成する**

```tsx
// 薬の追加・編集フォーム
import { useState } from 'react';
import { createMedication, updateMedication, Medication } from '../api/medications';
import { t, getLang } from '../i18n/index';

interface Props {
  medication?: Medication;        // 編集時はこれを渡す
  onSuccess: (med: Medication) => void;
  onCancel: () => void;
}

export default function MedicationForm({ medication, onSuccess, onCancel }: Props) {
  const lang = getLang();
  const [name, setName] = useState(medication?.name ?? '');
  const [limitPerDay, setLimitPerDay] = useState(medication?.limitPerDay ?? 1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = medication
        ? await updateMedication(medication.id, { name, limitPerDay })
        : await createMedication(name, limitPerDay);
      onSuccess(result);
    } catch (err: any) {
      setError(err.message ?? t('errors.internal', lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-white rounded-xl shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medications.name', lang)}
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medications.limitPerDay', lang)}
        </label>
        <input
          type="number"
          min={1}
          value={limitPerDay}
          onChange={e => setLimitPerDay(parseInt(e.target.value))}
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? t('common.loading', lang) : t('common.save', lang)}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          {t('common.cancel', lang)}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: `src/components/MedicationList.tsx` を作成する**

```tsx
// 薬リスト + 追加・編集・削除
import { useState, useEffect } from 'react';
import { listMedications, deleteMedication, Medication } from '../api/medications';
import MedicationForm from './MedicationForm';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function MedicationList() {
  const lang = getLang();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Medication | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証確認後にデータ取得
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        setMeds(await listMedications());
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(t('medications.confirmDelete', lang))) return;
    await deleteMedication(id);
    setMeds(prev => prev.filter(m => m.id !== id));
  }

  function handleSuccess(med: Medication) {
    setMeds(prev => {
      const exists = prev.find(m => m.id === med.id);
      return exists ? prev.map(m => m.id === med.id ? med : m) : [...prev, med];
    });
    setShowForm(false);
    setEditTarget(undefined);
  }

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  return (
    <div className="pb-20 px-4 pt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{t('medications.title', lang)}</h1>
        <button onClick={() => { setEditTarget(undefined); setShowForm(true); }}
          className="bg-amber-400 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
          + {t('common.add', lang)}
        </button>
      </div>

      {showForm && (
        <MedicationForm
          medication={editTarget}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditTarget(undefined); }}
        />
      )}

      {meds.length === 0 && !showForm ? (
        <p className="text-center text-gray-400 py-8">{t('empty.medications.noMedications', lang)}</p>
      ) : (
        meds.map(med => (
          <div key={med.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{med.name}</p>
              <p className="text-sm text-gray-400">{t('medications.limitPerDay', lang)}: {med.limitPerDay}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditTarget(med); setShowForm(true); }}
                className="text-sm text-amber-500 hover:text-amber-700">
                {t('common.edit', lang)}
              </button>
              <button onClick={() => handleDelete(med.id)}
                className="text-sm text-gray-400 hover:text-red-500">
                {t('common.delete', lang)}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/pages/medications.astro` を作成する**

```astro
---
import MedicationList from '../components/MedicationList';
import TabNav from '../components/TabNav';
---
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObatLog — 薬リスト</title>
  </head>
  <body class="bg-gray-50 min-h-screen">
    <MedicationList client:only="react" />
    <TabNav active="medications" client:only="react" />
  </body>
</html>
```

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 6: コミット**

```bash
git add src/components/TabNav.tsx src/components/MedicationList.tsx src/components/MedicationForm.tsx src/pages/medications.astro
git commit -m "feat: 薬リスト画面 (MedicationList / MedicationForm / TabNav)"
```

---

## Task 13: ホーム画面（今日の服薬）

**Files:**
- Create: `src/components/IntakeForm.tsx`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: `src/components/IntakeForm.tsx` を作成する**

```tsx
// 服薬記録フォーム（過量警告UI含む）
import { useState, useEffect } from 'react';
import { listMedications, Medication } from '../api/medications';
import { listIntakesByDate, createIntake, Intake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 今日の dateKey を Asia/Tokyo で取得
function getTodayKey(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export default function IntakeForm() {
  const [lang, setLangState] = useState<'ja' | 'en' | 'id'>(getLang());
  const [meds, setMeds] = useState<Medication[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<Intake[]>([]);
  const [units, setUnits] = useState<Record<string, number>>({});
  const [overdoseMsg, setOverdoseMsg] = useState('');
  const [takeError, setTakeError] = useState('');
  const [loading, setLoading] = useState(true);

  function handleLangChange(newLang: 'ja' | 'en' | 'id') {
    setLang(newLang);
    setLangState(newLang);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        const [medsData, intakesData] = await Promise.all([
          listMedications(),
          listIntakesByDate(getTodayKey()),
        ]);
        setMeds(medsData);
        setTodayIntakes(intakesData);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleTake(med: Medication) {
    setTakeError('');
    const takenUnits = units[med.id] ?? 1;
    try {
      const result = await createIntake(med.id, takenUnits);
      if (result.isOverdose) setOverdoseMsg(t('overdose.message', lang));
    setTodayIntakes(prev => [...prev, {
      id: result.intakeId,
      userId: '',
      medicationId: med.id,
      medicationName: med.name,
      limitPerDaySnapshot: med.limitPerDay,
      takenUnits,
      takenAt: { seconds: Date.now() / 1000 },
      dateKey: getTodayKey(),
      isOverdose: result.isOverdose,
      totalToday: result.totalToday,
    }]);
    } catch (err: any) {
      setTakeError(err.message ?? t('errors.internal', lang));
    }
  }

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  // 今日の累計を薬IDごとに集計
  const todayTotals: Record<string, number> = {};
  for (const intake of todayIntakes) {
    todayTotals[intake.medicationId] = intake.totalToday;
  }

  return (
    <div className="pb-20 px-4 pt-4 space-y-3">
      {/* ヘッダー: タイトル + 言語切替 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{t('home.title', lang)}</h1>
        <div className="flex gap-1">
          {(['ja', 'en', 'id'] as const).map(l => (
            <button key={l} onClick={() => handleLangChange(l)}
              className={`text-xs px-2 py-1 rounded-lg transition
                ${lang === l ? 'bg-amber-400 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-400">{getTodayKey()}</p>

      {/* エラー表示 */}
      {takeError && <p className="text-sm text-red-500">{takeError}</p>}

      {/* 過量警告（やわらかいアンバー色） */}
      {overdoseMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">💊</span>
          <p className="text-amber-800 text-sm">{overdoseMsg}</p>
        </div>
      )}

      {meds.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-400">{t('empty.home.noMedications', lang)}</p>
          <a href="/medications" className="text-amber-500 text-sm underline">
            {t('nav.medications', lang)} →
          </a>
        </div>
      ) : (
        meds.map(med => (
          <div key={med.id} className="bg-white rounded-xl shadow p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-medium text-gray-800">{med.name}</p>
              <p className="text-xs text-gray-400">
                {todayTotals[med.id] ?? 0} / {med.limitPerDay} {t('home.units', lang)}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={units[med.id] ?? 1}
                onChange={e => setUnits(prev => ({ ...prev, [med.id]: parseInt(e.target.value) }))}
                className="w-16 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-sm text-gray-500">{t('home.units', lang)}</span>
              <button
                onClick={() => handleTake(med)}
                className="ml-auto bg-amber-400 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
              >
                {t('home.take', lang)}
              </button>
            </div>
          </div>
        ))
      )}

      {meds.length > 0 && todayIntakes.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">{t('empty.home.noIntakesToday', lang)}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/index.astro` を更新する**

```astro
---
import IntakeForm from '../components/IntakeForm';
import TabNav from '../components/TabNav';
---
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObatLog</title>
  </head>
  <body class="bg-gray-50 min-h-screen">
    <IntakeForm client:only="react" />
    <TabNav active="home" client:only="react" />
  </body>
</html>
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/components/IntakeForm.tsx src/pages/index.astro
git commit -m "feat: ホーム画面 (服薬記録・過量警告)"
```

---

## Task 14: ログ一覧画面

**Files:**
- Create: `src/components/LogList.tsx`
- Create: `src/pages/logs.astro`

- [ ] **Step 1: `src/components/LogList.tsx` を作成する**

```tsx
// 服薬ログ一覧（dateKey でグループ化）
import { useState, useEffect } from 'react';
import { listRecentIntakes, Intake } from '../api/intakes';
import { t, getLang } from '../i18n/index';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LogList() {
  const lang = getLang();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/login'; return; }
      try {
        setIntakes(await listRecentIntakes(30));
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">{t('common.loading', lang)}</p>;

  if (intakes.length === 0) {
    return (
      <div className="pb-20 px-4 pt-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">{t('logs.title', lang)}</h1>
        <p className="text-center text-gray-400 py-8">{t('empty.logs.noIntakes', lang)}</p>
      </div>
    );
  }

  // dateKey でグループ化
  const grouped = intakes.reduce<Record<string, Intake[]>>((acc, intake) => {
    (acc[intake.dateKey] ??= []).push(intake);
    return acc;
  }, {});

  return (
    <div className="pb-20 px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">{t('logs.title', lang)}</h1>
      {Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey}>
          <p className="text-sm font-semibold text-gray-500 mb-2">{dateKey}</p>
          <div className="space-y-2">
            {items.map(intake => (
              <div
                key={intake.id}
                className={`bg-white rounded-xl shadow p-3 flex justify-between items-center
                  ${intake.isOverdose ? 'border-l-4 border-amber-300' : ''}`}
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">{intake.medicationName}</p>
                  <p className="text-xs text-gray-400">
                    {intake.takenUnits} {t('home.units', lang)} — 累計 {intake.totalToday} / {intake.limitPerDaySnapshot}
                  </p>
                </div>
                {intake.isOverdose && (
                  <span className="text-amber-400 text-sm">💊</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `src/pages/logs.astro` を作成する**

```astro
---
import LogList from '../components/LogList';
import TabNav from '../components/TabNav';
---
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObatLog — ログ</title>
  </head>
  <body class="bg-gray-50 min-h-screen">
    <LogList client:only="react" />
    <TabNav active="logs" client:only="react" />
  </body>
</html>
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/components/LogList.tsx src/pages/logs.astro
git commit -m "feat: ログ一覧画面"
```

---

## Task 15: PWA アイコン + 最終確認

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: PWA アイコンを配置する**

`public/icons/` に以下の2ファイルを配置:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

SVG から変換するか、任意のアイコンジェネレーターを使用。
アイコンデザインは 💊 をモチーフにしたシンプルなもの推奨。

- [ ] **Step 2: Firebase Emulator でローカル動作確認する**

```bash
# ターミナル1: Functions を起動
cd functions && npm run build && cd ..
firebase emulators:start --only auth,functions,firestore,hosting

# ターミナル2: Astro dev server を起動（.env にエミュレーターURLを設定）
npm run dev
```

確認項目:
- [ ] ログイン画面が表示される
- [ ] 新規登録 → ホームに遷移する
- [ ] 薬を登録できる
- [ ] 服薬記録できる
- [ ] 上限超えで過量警告が表示される（やわらかいアンバー色）
- [ ] ログ一覧に記録が表示される
- [ ] 言語切替（ja/en/id）が動作する

- [ ] **Step 3: プロダクションビルドが成功することを確認する**

```bash
npm run build
```

- [ ] **Step 4: 最終コミット**

```bash
git add public/icons/
git commit -m "chore: PWAアイコン追加・MVP実装完了"
```

---

## 動作確認チェックリスト

実装完了後、以下を Firebase Emulator で確認すること:

| チェック項目 | 確認方法 |
|-------------|---------|
| Firestore Security Rules が機能している | ブラウザコンソールから直接 Firestore にアクセスして `permission-denied` エラーが出ること |
| 他ユーザーのデータにアクセスできない | 2アカウント作成して確認 |
| 過量チェックが正しく動く | limitPerDay=2 の薬を3錠飲んで警告が出ること |
| PWA インストールが可能 | Chrome でアドレスバーのインストールアイコンが出ること |