# デモ機能（ゲストログイン）設計

## 概要

`/demo` にアクセスすると匿名認証でアプリを即体験できる機能。
採用担当向けポートフォリオと潜在ユーザー向けの両方を兼ねる。

当初 Phase 1（モック表示）/ Phase 2（ゲストログイン）を予定していたが、
要件整理の結果、統合して一本化する。

## 目的

- URL クリックだけでアプリの全機能を体験できる
- 登録不要で服薬記録・通知・OD検出を実際に触れる
- 24時間後にデータ自動削除

## ルーティング・認証フロー

```
/demo アクセス
  → Firebase Anonymous Auth で匿名認証
  → POST /v1/demo/setup でデモ用初期データ投入
  → / にリダイレクト（通常ユーザーと同じ UI）
```

- `/demo` は初回セットアップ専用ページ
- 既存の `onAuthStateChanged` が匿名ユーザーをそのまま拾う
- 画面上部にデモバナー表示（24h 期限 + アカウント作成導線）

## デモ用初期データ

`POST /v1/demo/setup` で以下を Firestore に投入:

### users

| フィールド | 値 |
|-----------|-----|
| isDemo | true |
| demoExpiresAt | now + 24h |
| language | 'ja' |
| notifyMethod | 'email' |
| demoEmail | null（設定画面で入力） |

### medications（3件）

| name | limitPerDay | notifyEnabled | notifyAt |
|------|------------|---------------|----------|
| レキサルティ（1mg） | 2 | true | ["08:00"] |
| デパス（0.5mg） | 3 | true | ["08:00", "20:00"] |
| ルネスタ（2mg） | 1 | true | ["22:00"] |

### intakes

直近3日分、各薬に1〜2件ずつ。ログ画面にデータが並ぶ程度。

### dailyCounts

intakes に対応するカウンター。

## デモユーザーの制限・保護

### 無効化する機能

| 機能 | 理由 |
|------|------|
| アカウント削除 | 24h で自動削除 |
| データエクスポート | デモデータに意味がない |
| パスワード変更 | 匿名ユーザーにはパスワードがない |
| Google ログイン連携 | デモの範囲外 |

### 有効なまま

- 薬の CRUD（作成・編集・削除）
- 服薬記録（飲んだ / Undo）
- OD 記録（気分タグ + メモ）
- ログ表示
- 通知設定（時刻変更 + メールアドレス入力）
- 言語切替
- 通知メール実送信

## メール通知（デモ用）

- 設定画面でメールアドレスを自由に入力可能
- 匿名ユーザーには Firebase Auth のメールがないため、`users.demoEmail` フィールドを使用
- `notify.ts` はデモユーザーの場合 `demoEmail` から送信先を取得
- 通知時刻（notifyAt）は薬の編集画面で自由に変更可能

### XSS 対策

- Functions 側でメールアドレス形式のバリデーション（正規表現 + zod）
- メールテンプレートへの値埋め込み時に HTML エスケープ
- Content-Type: text/plain も併送

## 24h 自動削除

### Scheduled Function: cleanupDemoUsers

- 実行間隔: 1時間おき（Cloud Scheduler）
- 対象: `isDemo === true` かつ `demoExpiresAt < now()`

### 削除順序

1. intakes / dailyCounts（参照データ）
2. medications
3. users ドキュメント
4. Firebase Auth アカウント（`admin.auth().deleteUser()`）

### 安全策

- `isDemo: true` かつ `demoExpiresAt` 超過のみ対象
- 通常ユーザーには `isDemo` フィールドがないため巻き込まれない
- 削除件数をログ出力（モニタリング用）

## フロント実装

### 新規ファイル

- `/src/app/demo/page.tsx` — セットアップページ（匿名認証 → データ投入 → リダイレクト）

### 既存コンポーネントの変更

| ファイル | 変更内容 |
|---------|---------|
| `AppLayout` | デモユーザー判定、デモバナー表示 |
| `SettingsPage` | デモ時はアカウント削除・エクスポート・パスワード変更を非表示、メールアドレス入力フィールド追加 |
| `LandingPage` | 「デモを試す」ボタン追加 → `/demo` へ |

### 変更しないもの

- Firestore ルール（全操作 Functions 経由のため変更不要）
- IntakeForm, MedicationList, LogList（そのまま動く）

## Functions 側

### 新規エンドポイント

- `POST /v1/demo/setup` — 匿名ユーザー用の初期データ投入。`isDemo` チェック必須
- `cleanupDemoUsers` — Scheduled Function（1時間おき）

### 既存の変更

- `users.ts` の `updateMe` — デモユーザーのメールアドレス更新時に XSS サニタイズ追加
- `notify.ts` — デモユーザーの場合、`demoEmail` フィールドから送信先を取得

## i18n

デモバナー、デモセットアップ画面のテキストを3言語（ja / en / id）追加。

## データモデル追加フィールド

### users コレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| isDemo | boolean | デモユーザーフラグ |
| demoExpiresAt | Timestamp | デモ有効期限（作成時 + 24h） |
| demoEmail | string \| null | デモ用通知メールアドレス |
