# ObatLog MVP 詳細設計書
**日付:** 2026-03-17
**ステータス:** 承認済み

---

## 1. プロジェクト概要

個人向け服薬記録・過量チェック PWA。
技術スタック: Astro + Tailwind + Firebase (Auth / Firestore / Functions / Hosting) + vite-plugin-pwa + astro-i18n

---

## 2. スコープ（MVP）

| 機能 | 対象 |
|------|------|
| メール/パスワード認証 | ✅ |
| 薬の登録・編集・削除 | ✅ |
| 服薬記録 | ✅ |
| 過量チェック（警告のみ・記録は保存） | ✅ |
| ログ一覧 | ✅ |
| PWA（vite-plugin-pwa） | ✅ |
| 多言語対応（ja / en / id） | ✅ |
| FCM 通知 | ❌ 後フェーズ |
| LINE Login | ❌ 後フェーズ |

---

## 3. システムアーキテクチャ

```
[Astro PWA (Firebase Hosting)]
        ↓ HTTPS + Authorization: Bearer <idToken>
[Firebase Functions (REST API v1)]
        ↓
[Firestore]  ← Security Rules: Functions サービスアカウントのみ書き込み可

[Firebase Auth] → JWT トークン → Functions で verifyIdToken()
```

### API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /v1/medications | 薬を登録 |
| GET | /v1/medications | 薬一覧取得 |
| PUT | /v1/medications/:id | 薬を更新 |
| DELETE | /v1/medications/:id | 薬を削除 |
| POST | /v1/intakes | 服薬記録（過量チェック含む） |
| GET | /v1/intakes | ログ一覧取得 |

- 全エンドポイントで `Authorization: Bearer <idToken>` 必須
- Functions 側で `admin.auth().verifyIdToken()` 検証
- Android アプリ化を見据えた API レイヤー設計

---

## 4. Firestore データモデル

サブコレクション禁止。全コレクションはルートレベル。

### `users/{userId}`
```
- email: string
- language: "ja" | "en" | "id"
- createdAt: timestamp
- notificationToken: string | null  // 後フェーズ用、MVP では null
```

### `medications/{medicationId}`
```
- userId: string
- name: string           // 薬の名前
- dosagePerUnit: number  // 1錠あたりの量（mg 等）
- limitPerDay: number    // 1日上限錠数
- createdAt: timestamp
- updatedAt: timestamp
```

### `intakes/{intakeId}`
```
- userId: string
- medicationId: string
- takenUnits: number     // 今回飲んだ錠数
- takenAt: timestamp
- dateKey: string        // "2026-03-17" 形式（Functions が自動生成）
- isOverdose: boolean    // 上限超えフラグ
- totalToday: number     // 記録時点の当日累計錠数
```

---

## 5. フォルダ構成

```
obatlog/
├── src/
│   ├── pages/
│   │   ├── index.astro        # ホーム（今日の服薬）
│   │   ├── medications.astro  # 薬リスト
│   │   └── logs.astro         # ログ一覧
│   ├── components/
│   │   ├── IntakeForm.tsx      # 服薬記録フォーム（Astro Island）
│   │   ├── MedicationList.tsx  # 薬リスト（Astro Island）
│   │   └── LogList.tsx         # ログ一覧（Astro Island）
│   ├── api/                    # Functions 呼び出し（リソース別）
│   │   ├── medications.ts
│   │   └── intakes.ts
│   ├── lib/
│   │   ├── firebase.ts         # Firebase 初期化
│   │   ├── api.ts              # ベース fetch ラッパー（token ヘッダー付与）
│   │   └── auth.ts             # Auth ヘルパー
│   ├── i18n/
│   │   ├── ja.json
│   │   ├── en.json
│   │   └── id.json
│   └── env.d.ts
├── functions/
│   ├── src/
│   │   ├── index.ts            # router 専任（ルート定義のみ）
│   │   ├── medications.ts      # 薬 CRUD ハンドラー
│   │   ├── intakes.ts          # 服薬記録・過量チェックハンドラー
│   │   └── middleware/
│   │       └── auth.ts         # トークン検証ミドルウェア
│   └── package.json
├── public/
│   └── icons/                  # PWA アイコン
├── astro.config.mjs
├── tailwind.config.mjs
├── firebase.json
└── package.json
```

---

## 6. 画面構成

### ホーム画面 (`/`)
- 今日の日付・服薬済み薬の一覧
- 薬ごとに「飲んだ」ボタン → 錠数入力 → 送信
- 過量時は **淡いアンバー色のやわらかいメッセージカード** を表示（責めるトーンなし）

### 薬リスト画面 (`/medications`)
- 登録済み薬の一覧（名前・1日上限）
- 追加・編集・削除

### ログ一覧画面 (`/logs`)
- `dateKey` でグルーピングした服薬履歴
- `isOverdose: true` の記録はやわらかい色で識別

### 共通 UI
- 下部タブナビ（ホーム / 薬 / ログ）
- 言語切替（ユーザー設定から変更）

---

## 7. 過量チェックロジック（Functions）

`POST /v1/intakes` の処理フロー:

```
1. idToken 検証
2. medicationId から limitPerDay を取得
3. 当日の intakes を dateKey でクエリ → 累計 totalToday を計算
4. totalToday + takenUnits > limitPerDay なら isOverdose: true
5. 記録は必ず保存（ブロックしない）
6. レスポンスに isOverdose フラグを返す
7. フロントが isOverdose: true ならやわらかいメッセージを表示
```

### 過量警告の UX 方針
- 色: 淡いアンバー / 黄色系（赤は使わない）
- アイコン: 💊 など穏やかなもの
- 文言（やさしいトーン）:
  - ja: 「今日はたくさん飲んだね。少し休んでね。」
  - en: "You've taken a lot today. Please take care."
  - id: "Kamu sudah minum banyak hari ini. Istirahat sebentar ya."

---

## 8. セキュリティ

- Firestore Security Rules: クライアントからの直接アクセス禁止（Functions のサービスアカウントのみ許可）
- 全 API: `verifyIdToken()` で認証必須
- ユーザーは自分の `userId` に紐づくデータのみアクセス可

---

## 9. 非対象（MVP外）

- FCM 通知
- LINE Login
- カスタム通知時間
- ダークモード
- 多人数管理
- 医療データ連携
