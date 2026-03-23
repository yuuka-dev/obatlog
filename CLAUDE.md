# CLAUDE.md
# Project: ObatLog
# Subtitle: ObatLog — 過量チェックもできる服薬記録アプリ。
# Purpose: AI（ClaudeCode）が「詳細設計・実装」をするための最上流ガイドライン

## リポジトリ
- **GitHub（origin）**: `yuuka-dev/obatlog` (private)

---

## 🚫 禁止事項（最重要 / DO NOT）

1. **複雑化禁止**
   - 不要なライブラリを追加しない
   - 過剰な抽象化・設計パターンを使わない

2. **未来のための過剰設計禁止**
   - 使わない画面・機能を作らない
   - "念のため"の構造禁止
   - フォルダ構成や DB の深い構造を作らない

3. **深い構造禁止**
   - Firestore サブコレクション禁止
   - ネスト禁止

4. **技術横移動禁止**
   - Firebase → 他のBaaSに変えない
   - UI ライブラリ増殖禁止

5. **セキュリティ軽視禁止**
   - 認証なし Firestore 書き込み禁止
   - ルール甘い設定禁止
   - Firestore を直接公開状態にしない

6. **AIの過度な自動拡張禁止**
   - ClaudeCode は仕様外機能を勝手に追加してはならない
   - "多人数管理、企業連携、医療級" など別方向へ行かない

7. **コミット時の末尾に追記禁止**
   - Co-Authored-By を追記してはならない

---

## 🎯 PURPOSE（要求定義）

ObatLog は、個人向けの「シンプルな服薬記録アプリ」。

目的は：

- 薬の"飲んだ"を記録
- 過量（OD）を防止
- 飲み忘れ対策
- スマホでサクッと使える
- PWA でアプリっぽく動く

医療機器レベルではなく、**個人の生活改善ツール**に徹する。

---

## 🏗 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| **フレームワーク** | Next.js (App Router) | SSG/静的エクスポート |
| **UI** | React + Tailwind CSS | コンポーネント + スタイリング |
| **PWA** | Serwist (@serwist/next) | Service Worker、オフラインキャッシュ |
| **認証** | Firebase Auth | メール/パスワード、Google ログイン、LINE ログイン（LIFF） |
| **DB** | Firestore | NoSQL、ドキュメントベース |
| **API** | Firebase Functions v2 (Express) | REST API (asia-northeast1) |
| **通知** | FCM + Microsoft Graph API | Web Push / メール通知（M365経由） |
| **ホスティング** | Firebase Hosting | 静的エクスポート + リライト |
| **広告（Web）** | Google AdSense | バナー広告 |
| **決済（Web）** | Stripe | 広告除去の買い切り課金 |
| **言語** | TypeScript | フロント・バックエンド共通 |

### Android版（予定）
| レイヤー | 技術 | 用途 |
|---------|------|------|
| **アプリ化** | Capacitor | Next.js をそのままAndroidアプリ化 |
| **ウィジェット** | Kotlin（ネイティブ） | ホーム画面ウィジェット |
| **通知** | FCM + Android ネイティブ通知 | Capacitor Push Notifications プラグイン + Kotlin カスタマイズ |
| **広告** | Google AdMob | バナー広告（アプリ内） |
| **決済** | Google Play Billing | 広告除去の買い切り課金 |

### Android版の通知設計
- Web版の Web Push（ブラウザ依存・不安定）から **Android ネイティブ通知に切り替え**
- FCM 受信は `@capacitor/push-notifications` プラグインで対応
- 通知チャンネル設定、リマインド再送等は Kotlin で実装
- **アプリを閉じていても通知が届く**（OS レベルで動作）

### Android版の Kotlin 実装範囲
| 機能 | 内容 |
|------|------|
| ホーム画面ウィジェット | 今日の服薬状況を表示 |
| 通知カスタマイズ | 通知チャンネル、サウンド、バイブ、リマインド再送 |

### 広告プラットフォームの使い分け
| プラットフォーム | 広告 | 理由 |
|-----------------|------|------|
| **Web版** | Google AdSense | Web サイト向け広告 |
| **Android版** | Google AdMob | アプリ向け広告。ネイティブ統合が良い |

※ AdSense と AdMob は同じ Google アカウントで管理可能

### iOS版（将来・Mac入手後）
- Capacitor + Swift（ウィジェット）
- 通知: FCM + iOS ネイティブ通知
- 広告: AdMob（iOS版）

### Web版の認証設計
| 認証方法 | 優先度 | 実装方法 |
|---------|--------|---------|
| **メール/パスワード** | 実装済み | Firebase Auth 標準 |
| **Google ログイン** | 高 | Firebase Auth の Google プロバイダ |
| **LINE ログイン（LIFF）** | 中 | LINE Login → Firebase カスタムトークン認証 |
| Apple ログイン | 低（iOS版公開時） | Firebase Auth の Apple プロバイダ |

- 既存のメール/パスワードユーザーとソーシャルログインのアカウントリンクを考慮する
- Google ログインは Firebase Auth で最も実装コストが低い

### Web版の通知設計（マルチチャネル）
| チャンネル | 実装方法 | 到達率 |
|-----------|---------|--------|
| **Web Push** | FCM（実装済み・不安定） | ブラウザ依存 |
| **メール** | Microsoft Graph API → M365 メールボックスから送信 | ほぼ100% |
| **LINE** | LINE Messaging API（LIFF 連携後） | 高い |

#### メール通知の実装
- **送信方法**: Firebase Functions → Microsoft Graph API → M365
- **認証**: Azure AD（Entra ID）アプリ登録 + Mail.Send 権限（アプリケーション権限）
- **送信元**: noreply@obatlog.osaka29.jp（M365 独自ドメイン）
- **SPF/DKIM/DMARC**: M365 側で設定済みのものを活用

#### 通知設定UI
- ユーザーが通知方法を選択できる設定画面を提供
- 選択肢: Web Push / メール（将来的に LINE も追加）
- users コレクションに `notifyMethod: 'push' | 'email' | 'line'` を追加
- 複数チャンネルの同時有効化も可能にする（`notifyMethods: string[]`）

---

## 📦 機能範囲

### ✔ 実装済み（MVP）
- ログイン（Firebase Auth / メール・パスワード）
- パスワードリセット
- 服薬記録（飲んだ錠数 + Undo）
- 薬の登録（名前、1日上限、通知設定）
- 1日上限チェック（OD防止）
- OD記録（気分タグ + メモ）
- 過去ログ表示（直近30件、日付グルーピング）
- 通知（FCM / 5分刻みの時刻設定、最大5件）
- PWA 対応（Serwist）
- 多言語対応（日本語・英語・インドネシア語）
- アカウント削除・データエクスポート
- プライバシーポリシー・利用規約
- エラーバウンダリ
- レスポンシブ（モバイル: タブナビ / デスクトップ: サイドバー）

### 🔜 次に実装（優先順）
1. 服薬時刻の表示（ログに takenAt を表示）
2. Google ログイン追加（Firebase Auth）
3. メール通知（Microsoft Graph API / M365 経由）
4. 通知設定UI（通知方法の選択: Web Push / メール）
5. ダークモード
6. 通知メッセージの多言語化
7. 服薬カレンダー表示
8. 広告表示
9. Stripe 決済（広告除去 500円買い切り）
10. LINE ログイン + LINE 通知（LIFF）

### 📱 Android対応時
- Capacitor でアプリ化
- Kotlin でホーム画面ウィジェット（今日の服薬状況）
- Google Play Billing（広告除去 650円買い切り）
- Google Play ストア公開（組織アカウント / 屋号）

### ❌ 非対象（やらない）
- 医療データ同期
- 疾患管理
- 多人数管理
- 複雑な UI
- 機能制限で基本機能を使えなくすること（基本機能は常に無料）

---

## 💰 マネタイズ

### 課金プラン

| | free | lifetime（買い切り） | subscriber（サブスク・将来） |
|---|---|---|---|
| 基本機能（服薬記録・OD検出・通知） | 無制限 | 無制限 | 無制限 |
| 広告 | あり | **なし** | **なし** |
| 新機能（カレンダー・ストリーク等） | ロック | **アンロック** | **アンロック** |

### フェーズ1（現在）: 広告 + 買い切り
- 広告除去の買い切り購入のみ提供
- 購入者は `planType: 'lifetime'` → 将来の新機能も永久アンロック（先行者優遇）

### フェーズ2（将来）: サブスク追加
- 買い切り販売を終了し、サブスク（月額/年額）に移行
- 既存の lifetime ユーザーはそのまま全機能利用可能（課金不要）
- 新規ユーザーはサブスクで広告除去 + 新機能アンロック

### 価格（手数料差を反映した二重価格制）

**買い切り（フェーズ1）:**
| プラットフォーム | 価格 | 決済 | 手数料 |
|-----------------|------|------|--------|
| **Web版** | **500円** | Stripe | 3.6% |
| **Android版** | **650円** | Google Play Billing | 15% |

**サブスク（フェーズ2・価格未定）:**
- 月額・年額は将来決定

### ユーザーの課金状態（users コレクション）
- `planType`: `'free'` | `'lifetime'` | `'subscriber'`
- lifetime と subscriber は同じ権限（広告なし + 全機能アンロック）

### ルール
- アプリ内で「Webの方が安い」と直接誘導しない（Google Play ポリシー準拠）
- **広告配置**: スマホ: TabNav下に固定バナー、PC: サイドバー下。全認証画面で常時表示。ランディングページには入れない
- 基本機能（服薬記録・OD検出・通知）は永久に無料。課金壁の裏に置かない

---

## 🔧 データモデル

### Collections（サブコレクションなし）

**users**: ユーザープロフィール
- id, email, language, notificationToken, createdAt

**medications**: 薬の登録情報
- id, userId, name, limitPerDay, notifyEnabled, notifyAt[], createdAt, updatedAt

**intakes**: 服薬記録
- id, userId, medicationId, medicationName, limitPerDaySnapshot, takenUnits, takenAt, dateKey, isOverdose, totalToday, cancelled, isOdLog, moodTags[], memo

**dailyCounts**: 日別カウンター（内部用）
- id: "{userId}_{medicationId}_{dateKey}", userId, medicationId, dateKey, total

---

## 🤖 ClaudeCode 実装方針

- 詳細設計・DB構造・フォルダ構成は ClaudeCode が自動決定
- ただし禁止事項には絶対に触れないこと
- 必要なフィールドや画面は ClaudeCode が補完してよい
- 設計は常に "最小限・シンプル・軽量" を優先
- 仕様外の勝手な拡張は禁止（提案は OK）

### コーディングルール
- コメントは日本語、変数名・関数名・ファイル名は英語
- Firebase Functions は **v2**（`firebase-functions/v2/https`）
- 過量警告は淡いアンバー色・やさしいトーン（赤禁止・強い否定禁止）
- TypeScript の `as any` は極力避ける

---

## 🛡 セキュリティ・コンプライアンス

- Firestore ルール: クライアント直接アクセス全拒否。全操作は Functions 経由
- API: idToken 検証必須。全エンドポイントで userId チェック
- 入力バリデーション: 文字数制限・数値範囲チェック済み
- アカウント削除・データエクスポート対応済み
- プライバシーポリシー・利用規約ページあり
