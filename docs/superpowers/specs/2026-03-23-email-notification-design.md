# メール通知 設計書

## 概要
既存の Web Push 通知に加え、Microsoft Graph API（M365）経由のメール通知を追加する。ユーザーが通知方法を Web Push / メール から選択できるようにする。

## データモデル変更

### users コレクション
- `notifyMethod: 'push' | 'email'` を追加（デフォルト: `'push'`）
- メール送信先は Firebase Auth のメールアドレスを使用（追加フィールドなし）
- `ensureUserDoc` のデフォルトに `notifyMethod: 'push'` を追加

## バックエンド

### `functions/src/mailSender.ts`（新規）
Microsoft Graph API でメールを送信するユーティリティ。

**トークン取得:**
- Azure AD（Entra ID）クライアント資格情報フロー
- `POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
- scope: `https://graph.microsoft.com/.default`
- トークンはメモリキャッシュ（`expiresAt` を保持し、有効期限の60秒前に再取得）
- 401 レスポンス時はキャッシュを破棄してリトライ（1回のみ）

**メール送信:**
- `POST https://graph.microsoft.com/v1.0/users/{送信元}/sendMail`
- 送信元: `noreply@obatlog.osaka29.jp`（環境変数 `MAIL_FROM`）
- `sendEmail(to, subject, htmlBody)` の単純なインターフェース

**シークレット管理:**
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` は Firebase Functions v2 の `defineSecret()` で管理（Google Secret Manager 経由）
- `MAIL_FROM` は通常の環境変数（`defineString()` または `functions/.env`、非機密情報）
- ローカル開発時は `functions/.env` から読み込み（`.gitignore` 済み）
- シークレット未設定時は `functions.logger.warn` で警告し、メール送信をスキップ（クラッシュしない）。エミュレータ環境でも安全に動作する

### `functions/src/notify.ts`（変更）
既存の `sendMedicationReminders` スケジューラを拡張:

1. ユーザーの `notifyMethod` を取得（未設定の場合は `'push'` として扱う — 既存ユーザー後方互換）
2. `'push'`: 既存の FCM 送信（変更なし）
3. `'email'`: Firebase Auth から最新のメールアドレスを取得し（`admin.auth().getUser(uid).email`）、`mailSender` でメール送信
4. 同じユーザー・同じ `notifyAt` 時刻に複数の薬がある場合は1通にまとめる（薬名をリスト表示）
5. push でトークンなし、または email でメールアドレスなしの場合はスキップ
6. **各ユーザーの送信は個別に try/catch** — 1件の失敗が他のユーザーの送信を妨げない。エラーは `functions.logger.error` でログ出力
7. Graph API レスポンス: HTTP 202 を成功として扱う。非2xx はエラーログ出力

### `functions/src/users.ts`（変更）
- `PUT /v1/users/me` で `notifyMethod` の更新を受け付ける
- バリデーション: `'push'` | `'email'` のみ許可
- `ensureUserDoc` に `notifyMethod: 'push'` を追加
- 既存ユーザー（`notifyMethod` フィールドなし）はバックエンド側で `'push'` として扱う（マイグレーション不要）

### メール内容
- **件名:** `ObatLog リマインダー`
- **本文:** HTML メール。アンバーカラーのシンプルなスタイル。`{薬名} の時間だよ`
- 送信元表示名: `ObatLog`

HTMLメールテンプレート（インライン CSS）:
```html
<html lang="ja"><head><meta charset="utf-8"></head><body>
<div style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:24px;">
  <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px;">ObatLog リマインダー</h2>
  <!-- 薬が1つの場合 -->
  <p style="color:#374151;font-size:16px;margin:0 0 8px;">{薬名} の時間だよ</p>
  <!-- 薬が複数の場合はリスト表示 -->
  <ul style="color:#374151;font-size:16px;margin:0 0 8px;padding-left:20px;">
    <li>{薬名1} の時間だよ</li>
    <li>{薬名2} の時間だよ</li>
  </ul>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="color:#9ca3af;font-size:12px;margin:0;">このメールは ObatLog の通知設定に基づいて送信されています。</p>
</div>
</body></html>
```

## フロント

### `src/api/users.ts`（変更）
- `UserProfile` インターフェースに `notifyMethod?: 'push' | 'email'` を追加

### `src/components/SettingsPage.tsx`（変更）
通知セクションを拡張:
- 通知方法の選択（Web Push / メール）
- 現在の選択状態を `getMe()` から取得
- 変更時に `PUT /v1/users/me` で `notifyMethod` を更新
- メール選択時は「{メールアドレス} に送信します」と表示
- Web Push 選択時は既存の通知許可ボタンを表示

### i18n（3言語）
追加キー:

| キー | ja | en | id |
|------|----|----|-----|
| `settings.notifyMethod` | 通知方法 | Notification method | Metode notifikasi |
| `settings.notifyMethodPush` | プッシュ通知 | Push notification | Notifikasi push |
| `settings.notifyMethodEmail` | メール | Email | Email |
| `settings.notifyEmailTo` | {email} に送信します | Sends to {email} | Dikirim ke {email} |

### メール言語
メール本文は日本語固定（通知メッセージの多言語化はスコープ外）。

## スコープ外
- LINE 通知（別サイクルで実装）
- 通知メッセージの多言語化（別タスク）
- メール通知のオプトアウトリンク
- 複数通知方法の同時有効化
- FCM トークン失効時の自動フォールバック（既存挙動のまま）
