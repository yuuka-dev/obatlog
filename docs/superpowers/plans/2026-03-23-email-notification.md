# メール通知 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Microsoft Graph API（M365）経由のメール通知を追加し、ユーザーが通知方法を Web Push / メール から選択できるようにする。

**Architecture:** `functions/src/mailSender.ts` に Graph API メール送信ユーティリティを新規作成。既存の `notify.ts` スケジューラを拡張して `notifyMethod` に応じた分岐を追加。フロントは `SettingsPage.tsx` に通知方法選択UIを追加。

**Tech Stack:** Firebase Functions v2, Microsoft Graph API, Azure AD (Entra ID) クライアント資格情報フロー, React, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-23-email-notification-design.md`

---

## Task 1: mailSender.ts — Graph API メール送信ユーティリティ

**Files:**
- Create: `functions/src/mailSender.ts`
- Create: `functions/src/tests/mailSender.test.ts`

- [ ] **Step 1: テストファイルを作成**

`functions/src/tests/mailSender.test.ts`:

```typescript
// mailSender のユニットテスト
// fetch をモックして Graph API 呼び出しをテスト

const mockFetch = jest.fn();
global.fetch = mockFetch;

// 環境変数セット
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.AZURE_CLIENT_SECRET = 'test-secret';
process.env.MAIL_FROM = 'noreply@example.com';

import { sendEmail, _resetTokenCache } from '../mailSender';

beforeEach(() => {
  mockFetch.mockReset();
  _resetTokenCache();
});

describe('sendEmail', () => {
  const tokenResponse = {
    access_token: 'test-token-123',
    expires_in: 3600,
  };

  test('トークン取得 → メール送信の順に fetch する', async () => {
    // トークン取得成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    // メール送信成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
    });

    await sendEmail('user@example.com', 'テスト件名', '<p>本文</p>');

    // トークン取得リクエスト
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[0]).toContain('login.microsoftonline.com/test-tenant');

    // メール送信リクエスト
    const mailCall = mockFetch.mock.calls[1];
    expect(mailCall[0]).toContain('graph.microsoft.com/v1.0/users/noreply@example.com/sendMail');
    const body = JSON.parse(mailCall[1].body);
    expect(body.message.toRecipients[0].emailAddress.address).toBe('user@example.com');
    expect(body.message.subject).toBe('テスト件名');
  });

  test('トークンをキャッシュし、2回目はトークン取得しない', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });
    await sendEmail('a@example.com', 's', '<p>b</p>');

    // 2回目: トークン取得なし
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });
    await sendEmail('b@example.com', 's2', '<p>b2</p>');

    // fetch: トークン1回 + メール2回 = 3回
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('メール送信で 401 → トークン再取得してリトライ', async () => {
    // 初回トークン
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    // メール送信 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' });
    // トークン再取得
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...tokenResponse, access_token: 'new-token' }),
    });
    // リトライ成功
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });

    await sendEmail('user@example.com', 's', '<p>b</p>');

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  test('トークン取得失敗でエラーを投げる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    await expect(sendEmail('user@example.com', 's', '<p>b</p>'))
      .rejects.toThrow('Failed to get access token');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd functions && npm test -- --testPathPattern=mailSender
```
Expected: FAIL（`mailSender` モジュールが存在しない）

- [ ] **Step 3: mailSender.ts を実装**

`functions/src/mailSender.ts`:

```typescript
// Microsoft Graph API メール送信ユーティリティ
// Azure AD クライアント資格情報フローでトークンを取得し、Graph API でメール送信する

import * as logger from 'firebase-functions/logger';

// トークンキャッシュ
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** テスト用: トークンキャッシュをリセット */
export function _resetTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

function getEnvConfig() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const mailFrom = process.env.MAIL_FROM;

  if (!tenantId || !clientId || !clientSecret || !mailFrom) {
    return null;
  }
  return { tenantId, clientId, clientSecret, mailFrom };
}

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  // 有効期限の60秒前に再取得
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken!;
}

async function sendMailRequest(token: string, mailFrom: string, to: string, subject: string, htmlBody: string): Promise<Response> {
  const url = `https://graph.microsoft.com/v1.0/users/${mailFrom}/sendMail`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        from: { emailAddress: { name: 'ObatLog', address: mailFrom } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  });
}

/**
 * Graph API でメールを送信する
 * 環境変数未設定時は警告ログを出してスキップ
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const config = getEnvConfig();
  if (!config) {
    logger.warn('[mailSender] 環境変数が未設定のためメール送信をスキップ');
    return;
  }

  const { tenantId, clientId, clientSecret, mailFrom } = config;
  let token = await getAccessToken(tenantId, clientId, clientSecret);
  let res = await sendMailRequest(token, mailFrom, to, subject, htmlBody);

  // 401 → トークン再取得してリトライ（1回のみ）
  if (res.status === 401) {
    logger.warn('[mailSender] 401 received, refreshing token');
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await getAccessToken(tenantId, clientId, clientSecret);
    res = await sendMailRequest(token, mailFrom, to, subject, htmlBody);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API sendMail failed: ${res.status} ${text}`);
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd functions && npm test -- --testPathPattern=mailSender
```
Expected: PASS（全4テスト）

- [ ] **Step 5: ビルド確認**

```bash
cd functions && npm run build
```

- [ ] **Step 6: コミット**

```bash
git add functions/src/mailSender.ts functions/src/tests/mailSender.test.ts
git commit -m "feat: Graph API メール送信ユーティリティ追加"
```

---

## Task 2: notify.ts — メール通知分岐の追加

**Files:**
- Modify: `functions/src/notify.ts`
- Create: `functions/src/mailTemplate.ts`

- [ ] **Step 1: メールテンプレートを作成**

`functions/src/mailTemplate.ts`:

```typescript
// メール通知のHTMLテンプレート

/** 単一の薬のリマインダーメール */
function singleMedHtml(medName: string): string {
  return `<html lang="ja"><head><meta charset="utf-8"></head><body>
<div style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:24px;">
  <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px;">ObatLog リマインダー</h2>
  <p style="color:#374151;font-size:16px;margin:0 0 8px;">${medName} の時間だよ</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="color:#9ca3af;font-size:12px;margin:0;">このメールは ObatLog の通知設定に基づいて送信されています。</p>
</div>
</body></html>`;
}

/** 複数の薬のリマインダーメール */
function multiMedHtml(medNames: string[]): string {
  const items = medNames.map(n => `    <li>${n} の時間だよ</li>`).join('\n');
  return `<html lang="ja"><head><meta charset="utf-8"></head><body>
<div style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:24px;">
  <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px;">ObatLog リマインダー</h2>
  <ul style="color:#374151;font-size:16px;margin:0 0 8px;padding-left:20px;">
${items}
  </ul>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="color:#9ca3af;font-size:12px;margin:0;">このメールは ObatLog の通知設定に基づいて送信されています。</p>
</div>
</body></html>`;
}

/** リマインダーメールのHTMLを生成 */
export function buildReminderHtml(medNames: string[]): string {
  if (medNames.length === 1) return singleMedHtml(medNames[0]);
  return multiMedHtml(medNames);
}
```

- [ ] **Step 2: notify.ts を拡張**

`functions/src/notify.ts` を以下に書き換え:

```typescript
// FCM / メール通知: 毎時実行し、該当時刻の薬リマインダーを送信
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getTokyoReminderSlot } from './reminderSlot';
import { sendEmail } from './mailSender';
import { buildReminderHtml } from './mailTemplate';

const db = () => admin.firestore();

export const sendMedicationReminders = onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
  async () => {
    const now = new Date();
    const { timeSlot, dateKey } = getTokyoReminderSlot(now);

    // 通知対象の薬を取得
    const medsSnap = await db().collection('medications')
      .where('notifyEnabled', '==', true)
      .where('notifyAt', 'array-contains', timeSlot)
      .get();

    console.info('[sendMedicationReminders] tick', { timeSlot, dateKey, matchedMeds: medsSnap.size });
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
    let totalSent = 0;
    for (const [userId, meds] of userMeds) {
      try {
        const userSnap = await db().collection('users').doc(userId).get();
        const userData = userSnap.data();
        // notifyMethod 未設定は 'push' として扱う（既存ユーザー後方互換）
        const notifyMethod: string = userData?.notifyMethod ?? 'push';

        // 上限チェック: 上限に達した薬を除外
        const activeMeds: Array<{ name: string }> = [];
        for (const med of meds) {
          const counterRef = db().collection('dailyCounts').doc(`${userId}_${med.medicationId}_${dateKey}`);
          const counterSnap = await counterRef.get();
          const currentTotal = counterSnap.exists ? (counterSnap.data()?.total ?? 0) : 0;
          if (currentTotal < med.limitPerDay) {
            activeMeds.push(med);
          }
        }

        if (activeMeds.length === 0) continue;

        if (notifyMethod === 'email') {
          // メール通知
          let email: string | undefined;
          try {
            const authUser = await admin.auth().getUser(userId);
            email = authUser.email;
          } catch {
            console.warn(`[sendMedicationReminders] auth.getUser failed for ${userId}`);
          }
          if (!email) {
            console.info('[sendMedicationReminders] skip email (no address)', { userId });
            continue;
          }

          const html = buildReminderHtml(activeMeds.map(m => m.name));
          await sendEmail(email, 'ObatLog リマインダー', html);
          totalSent++;
        } else {
          // FCM プッシュ通知（既存ロジック）
          const token = userData?.notificationToken;
          if (!token) {
            console.info('[sendMedicationReminders] skip (no token)', { userId, timeSlot, medsCount: meds.length });
            continue;
          }

          let userSent = 0;
          let userSendErrors = 0;
          for (const med of activeMeds) {
            try {
              await admin.messaging().send({
                token,
                notification: { title: 'ObatLog', body: `${med.name} の時間だよ` },
                webpush: { fcmOptions: { link: '/' } },
              });
              userSent++;
              totalSent++;
            } catch (err) {
              console.error(`FCM send error for user ${userId}:`, err);
              userSendErrors++;
            }
          }

          console.info('[sendMedicationReminders] user result', {
            userId, timeSlot, medsCount: meds.length,
            activeMeds: activeMeds.length, userSent, userSendErrors,
          });
        }
      } catch (err) {
        // 1ユーザーの失敗が他に影響しない
        console.error(`[sendMedicationReminders] error for user ${userId}:`, err);
      }
    }

    console.info('[sendMedicationReminders] total result', { timeSlot, dateKey, totalSent });
  }
);
```

- [ ] **Step 3: ビルド確認**

```bash
cd functions && npm run build
```

- [ ] **Step 4: コミット**

```bash
git add functions/src/notify.ts functions/src/mailTemplate.ts
git commit -m "feat: notify.ts にメール通知分岐を追加"
```

---

## Task 3: users.ts — notifyMethod の更新対応

**Files:**
- Modify: `functions/src/users.ts`

- [ ] **Step 1: ensureUserDoc に notifyMethod を追加**

`functions/src/users.ts` の `ensureUserDoc` 関数内、`ref.set()` のオブジェクトに `notifyMethod: 'push'` を追加:

変更前:
```typescript
    await ref.set({
      email,
      language: 'ja',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notificationToken: null,
      adFree: false,
    });
```

変更後:
```typescript
    await ref.set({
      email,
      language: 'ja',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notificationToken: null,
      adFree: false,
      notifyMethod: 'push',
    });
```

- [ ] **Step 2: PUT /v1/users/me に notifyMethod のバリデーションを追加**

`functions/src/users.ts` の `usersRouter.put('/me', ...)` ハンドラー内、`notificationToken` の処理の後に追加:

変更前:
```typescript
  const { language, notificationToken } = req.body;
  const updates: Record<string, unknown> = {};
```

変更後:
```typescript
  const { language, notificationToken, notifyMethod } = req.body;
  const updates: Record<string, unknown> = {};
```

`notificationToken` の `if` ブロックの後に追加:
```typescript
  if (notifyMethod !== undefined) {
    if (!['push', 'email'].includes(notifyMethod)) {
      return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'notifyMethod must be push or email.' } });
    }
    updates.notifyMethod = notifyMethod;
  }
```

- [ ] **Step 3: ビルド確認**

```bash
cd functions && npm run build
```

- [ ] **Step 4: コミット**

```bash
git add functions/src/users.ts
git commit -m "feat: users.ts に notifyMethod 追加"
```

---

## Task 4: フロント — UserProfile 型と API 更新

**Files:**
- Modify: `src/api/users.ts`

- [ ] **Step 1: UserProfile に notifyMethod を追加**

`src/api/users.ts` を以下に書き換え:

```typescript
// ユーザープロフィール API クライアント
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  language: 'ja' | 'en' | 'id';
  notificationToken?: string;
  notifyMethod?: 'push' | 'email';
  adFree: boolean;
}

export const getMe = () => apiFetch<UserProfile>('/v1/users/me');

export const updateMe = (data: { language?: 'ja' | 'en' | 'id'; notifyMethod?: 'push' | 'email' }) =>
  apiFetch<UserProfile>('/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
```

- [ ] **Step 2: ビルド確認**

```bash
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/api/users.ts
git commit -m "feat: UserProfile に notifyMethod 追加、updateMe 汎用化"
```

---

## Task 5: フロント — i18n キー追加（3言語）

**Files:**
- Modify: `src/i18n/ja.json`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/id.json`

- [ ] **Step 1: ja.json にキーを追加**

`ja.json` の最後のキーの末尾にカンマを追加し、その下に以下を追加:

```json
  "settings.notifyMethod": "通知方法",
  "settings.notifyMethodPush": "プッシュ通知",
  "settings.notifyMethodEmail": "メール",
  "settings.notifyEmailTo": "{email} に送信します"
```

- [ ] **Step 2: en.json にキーを追加**

```json
  "settings.notifyMethod": "Notification method",
  "settings.notifyMethodPush": "Push notification",
  "settings.notifyMethodEmail": "Email",
  "settings.notifyEmailTo": "Sends to {email}"
```

- [ ] **Step 3: id.json にキーを追加**

```json
  "settings.notifyMethod": "Metode notifikasi",
  "settings.notifyMethodPush": "Notifikasi push",
  "settings.notifyMethodEmail": "Email",
  "settings.notifyEmailTo": "Dikirim ke {email}"
```

- [ ] **Step 4: ビルド確認**

```bash
npm run build
```

- [ ] **Step 5: コミット**

```bash
git add src/i18n/ja.json src/i18n/en.json src/i18n/id.json
git commit -m "feat: メール通知用 i18n キー追加（3言語）"
```

---

## Task 6: フロント — SettingsPage に通知方法選択UIを追加

**Files:**
- Modify: `src/components/SettingsPage.tsx`

- [ ] **Step 1: import に getMe, updateMe を追加**

`src/components/SettingsPage.tsx` の import を変更:

変更前:
```typescript
import { apiFetch } from '../lib/api';
```

変更後:
```typescript
import { apiFetch } from '../lib/api';
import { getMe, updateMe } from '../api/users';
```

- [ ] **Step 2: state と useEffect を追加**

既存の state 群の後に追加:

```typescript
  const [notifyMethod, setNotifyMethod] = useState<'push' | 'email'>('push');
  const [userEmail, setUserEmail] = useState('');
  const [methodLoading, setMethodLoading] = useState(false);
```

既存の `useEffect`（`Notification.permission` を取得するもの）の後に追加:

```typescript
  useEffect(() => {
    getMe().then(user => {
      setNotifyMethod(user.notifyMethod ?? 'push');
      setUserEmail(user.email);
    }).catch(() => {});
  }, []);
```

- [ ] **Step 3: 通知方法変更ハンドラーを追加**

`handleEnableNotifications` の後に追加:

```typescript
  async function handleNotifyMethodChange(method: 'push' | 'email') {
    setMethodLoading(true);
    try {
      await updateMe({ notifyMethod: method });
      setNotifyMethod(method);
    } catch {
      setError(t('errors.internal', lang));
    } finally {
      setMethodLoading(false);
    }
  }
```

- [ ] **Step 4: 通知セクションのUIを拡張**

既存の通知セクション（`{/* 通知 */}` の `<section>`）を以下に置き換え:

```tsx
      {/* 通知 */}
      <section className="bg-white border rounded-lg px-4 py-3 space-y-3">
        {/* 通知方法の選択 */}
        <div>
          <span className="text-sm text-gray-600">{t('settings.notifyMethod' as any, lang)}</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleNotifyMethodChange('push')}
              disabled={methodLoading}
              className={`flex-1 text-sm py-2 rounded-lg transition ${
                notifyMethod === 'push'
                  ? 'bg-amber-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {t('settings.notifyMethodPush' as any, lang)}
            </button>
            <button
              onClick={() => handleNotifyMethodChange('email')}
              disabled={methodLoading}
              className={`flex-1 text-sm py-2 rounded-lg transition ${
                notifyMethod === 'email'
                  ? 'bg-amber-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {t('settings.notifyMethodEmail' as any, lang)}
            </button>
          </div>
        </div>

        {/* プッシュ通知: 許可ボタン */}
        {notifyMethod === 'push' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.notifications' as any, lang)}</span>
            {notifyStatus === 'granted' ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">ON</span>
            ) : notifyStatus === 'denied' ? (
              <span className="text-xs text-gray-400">{t('settings.notifyDenied' as any, lang)}</span>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={notifyLoading}
                className="text-xs bg-amber-400 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition disabled:opacity-50"
              >
                {notifyLoading ? '...' : t('settings.notifyEnable' as any, lang)}
              </button>
            )}
          </div>
        )}

        {/* メール通知: 送信先表示 */}
        {notifyMethod === 'email' && userEmail && (
          <p className="text-xs text-gray-500">
            {(t('settings.notifyEmailTo' as any, lang) as string).replace('{email}', userEmail)}
          </p>
        )}

        {notifyError && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
            {notifyError}
          </p>
        )}
      </section>
```

- [ ] **Step 5: ビルド確認**

```bash
npm run build
```

- [ ] **Step 6: コミット**

```bash
git add src/components/SettingsPage.tsx
git commit -m "feat: SettingsPage に通知方法選択UIを追加"
```

---

## Task 7: Firebase Functions シークレット設定（手動）

- [ ] **Step 1: MAIL_FROM 環境変数を設定**

`functions/.env` に `MAIL_FROM=noreply@obatlog.osaka29.jp` が設定済みであることを確認（`.gitignore` 済み）。
本番用には `functions/.env.obatlog`（Firebase プロジェクト用）にも追加:

```
MAIL_FROM=noreply@obatlog.osaka29.jp
```

- [ ] **Step 2: Google Secret Manager にシークレットを登録**

```bash
cd functions
firebase functions:secrets:set AZURE_TENANT_ID
firebase functions:secrets:set AZURE_CLIENT_ID
firebase functions:secrets:set AZURE_CLIENT_SECRET
```

各コマンドで値を入力する。

- [ ] **Step 3: notify.ts で defineSecret を使用するよう更新**

`functions/src/notify.ts` の `onSchedule` オプションに `secrets` を追加:

変更前:
```typescript
export const sendMedicationReminders = onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
```

変更後:
```typescript
export const sendMedicationReminders = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    secrets: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
  },
```

- [ ] **Step 4: ビルド確認 & コミット**

```bash
cd functions && npm run build
git add functions/src/notify.ts
git commit -m "feat: notify.ts に defineSecret 設定追加"
```

- [ ] **Step 5: デプロイ**

```bash
firebase deploy --only functions
```
