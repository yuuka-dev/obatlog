# 02_Requirements_Definition.md
# 要件定義書 - ObatLog

---

## 1. 機能要件（Functional Requirements）

### 1.1 ログイン/認証
- Firebase Auth（メール／パスワード）
- Optional: LINE Login（LIFF）

### 1.2 服薬記録
- 薬ごとに “飲んだ錠数” を記録
- 日付・時刻を自動記録

### 1.3 過量チェック
- 1日上限を超えた場合に警告
- Functions によるバリデーション

### 1.4 薬一覧管理
- 薬の登録（名前、錠数、上限）
- 編集・削除

### 1.5 ログ閲覧
- 日別の一覧
- 最新順ソート

### 1.6 通知機能（Web Push）
- 飲み忘れ防止通知（FCM）
- 毎日決まった時間に通知

### 1.7 PWA
- オフライン簡易対応
- ホーム画面に追加

---

## 2. 非機能要件（Non-functional Requirements）

### 2.1 パフォーマンス
- 1画面ロード 1 秒以内
- Firestore クエリは軽量

### 2.2 セキュリティ
- Firestore 認証必須
- 認証なし書き込み禁止

### 2.3 信頼性
- Functions 失敗時はリトライ（Firebase 標準機能）

### 2.4 スケーラビリティ
- Firebase 標準のスケールに従う（個人運用）

---

## 3. 制約（Constraints）
- Next.js / Firebase 以外の技術は使用禁止
- DB は Firestore のみ（サブコレ禁止）
- SW は vite-plugin-pwa のみ