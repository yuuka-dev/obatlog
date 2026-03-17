# ObatLog MVP 詳細設計書
**日付:** 2026-03-17
**ステータス:** 承認済み

---

## 1. プロジェクト概要

個人向け服薬記録・過量チェック PWA。
技術スタック: Astro + Tailwind + Firebase (Auth / Firestore / **Functions v2** / Hosting) + vite-plugin-pwa + astro-i18n

---

## 2. スコープ（MVP）

| 機能 | 対象 |
|------|------|
| メール/パスワード認証 | ✅ |
| 薬の登録・編集・削除 | ✅ |
| 服薬記録 | ✅ |
| 過量チェック（警告のみ・記録は保存） | ✅ |
| ログ一覧（直近30件） | ✅ |
| PWA（vite-plugin-pwa） | ✅ |
| 多言語対応（ja / en / id） | ✅ |
| FCM 通知 | ❌ 後フェーズ |
| LINE Login | ❌ 後フェーズ |

---

## 3. システムアーキテクチャ

```
[Astro PWA (Firebase Hosting)]
        ↓ HTTPS + Authorization: Bearer <idToken>
[Firebase Functions v2 (REST API)]
        ↓
[Firestore]  ← Security Rules: 全クライアント直接アクセス禁止
                              Functions サービスアカウントのみ read/write 可

[Firebase Auth] → JWT トークン → Functions で verifyIdToken()
```

### API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /v1/users/me | ユーザープロフィール取得 |
| PUT | /v1/users/me | ユーザープロフィール更新（language のみ） |
| POST | /v1/medications | 薬を登録 |
| GET | /v1/medications | 薬一覧取得 |
| PUT | /v1/medications/:id | 薬を更新（name / limitPerDay のみ変更可） |
| DELETE | /v1/medications/:id | 薬を削除（ハード削除） |
| POST | /v1/intakes | 服薬記録（過量チェック含む） |
| GET | /v1/intakes?dateKey=YYYY-MM-DD | 指定日の服薬記録取得 |
| GET | /v1/intakes?limit=30 | 直近N件取得（デフォルト limit=30） |

**クエリパラメータの組み合わせ:**
- `?dateKey=2026-03-17` → 特定日のみ（ホーム画面で使用）
- `?limit=30` → 最新30件（ログ一覧画面で使用）
- パラメータなし → limit=30 をデフォルト適用

**注意:** intake レコードは**イミュータブル**（削除・更新エンドポイントなし）。
記録の誤りは仕様上許容する（個人ツールとして過剰な管理機能は不要）。

- 全エンドポイントで `Authorization: Bearer <idToken>` 必須
- Functions 側で `admin.auth().verifyIdToken()` 検証
- Android アプリ化を見据えた API レイヤー設計

### API エラーレスポンスフォーマット

全エンドポイント共通のエラーレスポンス:
```json
{
  "error": {
    "code": "MEDICATION_NOT_FOUND",
    "message": "The requested medication was not found."
  }
}
```

| HTTP ステータス | code 例 | 説明 |
|----------------|---------|------|
| 400 | `INVALID_REQUEST` | リクエストボディ不正 |
| 401 | `UNAUTHORIZED` | idToken なし or 期限切れ |
| 403 | `FORBIDDEN` | 他ユーザーのリソースへのアクセス |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 500 | `INTERNAL_ERROR` | Functions 内部エラー |

### CORS ポリシー

- 許可オリジン: `https://obatlog.osaka29.jp`（本番）および `http://localhost:4321`（開発）
- 許可メソッド: `GET, POST, PUT, DELETE, OPTIONS`
- 許可ヘッダー: `Content-Type, Authorization`
- Functions v2 の `cors` オプションで設定（`onRequest` の `cors` パラメータ使用）

### Firebase Functions v2 設定方針

- `firebase-functions/v2/https` の `onRequest` を使用
- タイムアウト: デフォルト 60s（MVP では変更不要）
- リージョン: `asia-northeast1`（東京）
- 失敗時リトライ: HTTP トリガーはデフォルトでリトライなし（冪等でないため）
- `onUserCreate` トリガーは `firebase-functions/v2/identity` を使用

---

## 4. Firestore データモデル

サブコレクション禁止。全コレクションはルートレベル。

### `users/{userId}`
```
- email: string
- language: "ja" | "en" | "id"   // デフォルト "ja"
- createdAt: timestamp
- notificationToken: string | null  // 後フェーズ用、MVP では null
```
※ `users` ドキュメントは Firebase Auth の `onUserCreate` トリガー（Functions v2）で自動生成。
  `language` のデフォルトは `"ja"`（ブラウザ言語検出なし）。
  `PUT /v1/users/me` で更新可能。更新可能フィールドは `language` のみ。

### `medications/{medicationId}`
```
- userId: string
- name: string          // 薬の名前（例: "ロラゼパム"）
- limitPerDay: number   // 1日上限錠数（整数）
- createdAt: timestamp
- updatedAt: timestamp
```
※ 錠数は常に「錠」単位で扱う。
※ `limitPerDay` を変更しても過去の `intakes` の `isOverdose` は更新しない。
  `isOverdose` は**記録時点の上限値**に基づくスナップショット（履歴の正確性を優先）。
※ ハード削除後、対応する `intakes` の `medicationName` スナップショットで表示を維持。

### `intakes/{intakeId}`
```
- userId: string
- medicationId: string
- medicationName: string      // 記録時点の薬名スナップショット（薬削除後も表示用に保持）
- limitPerDaySnapshot: number // 記録時点の上限値スナップショット（上限変更後の比較基準ずれ防止）
- takenUnits: number          // 今回飲んだ錠数
- takenAt: timestamp          // Functions がサーバー時刻で設定（クライアント時刻不使用）
- dateKey: string             // "2026-03-17" 形式（Functions が takenAt から自動生成）
- isOverdose: boolean         // 上限超えフラグ（記録時点の limitPerDay で判定・イミュータブル）
- totalToday: number          // この記録を含む当日・同薬の累計錠数
```

---

## 5. フォルダ構成

```
obatlog/
├── src/
│   ├── pages/
│   │   ├── index.astro        # ホーム（今日の服薬）
│   │   ├── login.astro        # ログイン画面（未認証ユーザーのみアクセス可）
│   │   ├── medications.astro  # 薬リスト
│   │   └── logs.astro         # ログ一覧
│   ├── components/
│   │   ├── LoginForm.tsx       # ログインフォーム（Astro Island）
│   │   ├── IntakeForm.tsx      # 服薬記録フォーム（Astro Island）
│   │   ├── MedicationList.tsx  # 薬リスト表示（Astro Island）
│   │   ├── MedicationForm.tsx  # 薬の追加・編集フォーム（Astro Island）
│   │   └── LogList.tsx         # ログ一覧（Astro Island）
│   ├── api/                    # Functions 呼び出し（リソース別）
│   │   ├── users.ts            # ユーザープロフィール
│   │   ├── medications.ts      # 薬 CRUD
│   │   └── intakes.ts          # 服薬記録
│   ├── lib/
│   │   ├── firebase.ts         # Firebase 初期化
│   │   ├── api.ts              # ベース fetch ラッパー（token ヘッダー付与・エラーハンドリング共通化）
│   │   └── auth.ts             # Auth ヘルパー・認証状態管理
│   ├── middleware.ts            # Astro middleware: 未認証 → /login にリダイレクト
│   ├── i18n/
│   │   ├── ja.json
│   │   ├── en.json
│   │   └── id.json
│   └── env.d.ts
├── functions/
│   ├── src/
│   │   ├── index.ts            # router 専任（ルート定義のみ）
│   │   ├── users.ts            # ユーザープロフィールハンドラー + onUserCreate トリガー
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

### ログイン画面 (`/login`)
- メールアドレス・パスワード入力
- ログイン / 新規登録
- 認証済みユーザーは `/` にリダイレクト

### ホーム画面 (`/`)
- 今日の日付・今日の服薬記録（`GET /v1/intakes?dateKey=今日` で取得）
- 薬一覧から「飲んだ」ボタン → 錠数入力 → 送信
- 過量時は **淡いアンバー色のやわらかいメッセージカード** を表示（責めるトーンなし）
- 右上に言語切替ボタン（ja / en / id）→ `PUT /v1/users/me` で保存 → ページ再描画

**エンプティ状態:**
- 薬が0件: 「まだ薬が登録されていません。薬リストから追加してください。」＋薬リストへのリンク
- 今日の服薬記録が0件: 「今日はまだ記録がありません。」（エラーではなく通常状態として表示）

### 薬リスト画面 (`/medications`)
- 登録済み薬の一覧（名前・1日上限錠数）
- 追加: `MedicationForm.tsx` をインライン or モーダル表示
- 編集可能フィールド: `name`・`limitPerDay`
- 削除: ハード削除（確認ダイアログあり）

**エンプティ状態:**
- 薬が0件: 「薬がまだ登録されていません。」＋追加ボタンを目立つ位置に表示

### ログ一覧画面 (`/logs`)
- `GET /v1/intakes?limit=30` で直近30件取得
- `dateKey` でグルーピング表示
- `isOverdose: true` の記録はやわらかい色で識別
- 薬が削除済みでも `medicationName` スナップショットで名前を表示

**エンプティ状態:**
- 記録が0件: 「まだ服薬記録がありません。」（ホーム画面から記録を促すリンク付き）

### 共通 UI
- 下部タブナビ（ホーム / 薬 / ログ）
- 未認証: `src/middleware.ts` が `/login` にリダイレクト

---

## 7. 過量チェックロジック（Functions）

`POST /v1/intakes` のリクエストボディ:
```json
{
  "medicationId": "string",
  "takenUnits": 1
}
```
※ `takenAt` はクライアントから送らない。Functions がサーバー時刻（`serverTimestamp()`）で設定。

処理フロー:
```
1. idToken 検証 → userId 取得
2. medicationId から { name, limitPerDay } を取得
3. 当日の intakes を { userId, medicationId, dateKey } でクエリ
   → 同薬の既存累計 previousTotal を計算
4. newTotal = previousTotal + takenUnits
5. newTotal > limitPerDay なら isOverdose: true（超過でも必ず保存）
6. Firestore に保存:
   { userId, medicationId, medicationName: name,
     limitPerDaySnapshot: limitPerDay,
     takenUnits, takenAt: serverTimestamp(),
     dateKey: "YYYY-MM-DD", isOverdose, totalToday: newTotal }
7. レスポンス: { intakeId, isOverdose, totalToday }
8. フロントが isOverdose: true ならやわらかいメッセージを表示
```

**上限変更時の挙動:**
`limitPerDay` を変更しても過去の `intakes.isOverdose` は再計算しない。
各 intake の `limitPerDaySnapshot` が記録時点の判定基準として保持される。

### 過量警告の UX 方針
- 色: 淡いアンバー / 黄色系（赤は使わない）
- アイコン: 💊 など穏やかなもの
- 文言（やさしいトーン）:
  - ja: 「今日はたくさん飲んだね。少し休んでね。」
  - en: "You've taken a lot today. Please take care."
  - id: "Kamu sudah minum banyak hari ini. Istirahat sebentar ya."

---

## 8. セキュリティ

- Firestore Security Rules: 全コレクションで `allow read, write: if false;` — クライアントからの直接アクセスを完全禁止
- 全読み書きは Functions 経由のみ（サービスアカウントが Admin SDK で操作）
- 全 API: `verifyIdToken()` で認証必須
- ユーザーは自分の `userId` に紐づくデータのみ Functions 内でフィルタリング

---

## 9. i18n キー命名規則

`src/i18n/{ja,en,id}.json` のキー構造:

```
{namespace}.{element}
```

**名前空間一覧:**

| namespace | 用途 |
|-----------|------|
| `common` | ボタン・共通ラベル（save, cancel, delete など） |
| `nav` | タブナビラベル |
| `home` | ホーム画面固有テキスト |
| `medications` | 薬リスト画面固有テキスト |
| `logs` | ログ一覧画面固有テキスト |
| `auth` | ログイン画面テキスト |
| `overdose` | 過量警告メッセージ |
| `empty` | エンプティ状態メッセージ |
| `errors` | エラーメッセージ |

**キー例:**
```json
{
  "common.save": "保存",
  "common.cancel": "キャンセル",
  "common.delete": "削除",
  "nav.home": "ホーム",
  "nav.medications": "薬",
  "nav.logs": "ログ",
  "home.title": "今日の服薬",
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

キー名は **camelCase**。namespace と element は `.` で区切る。

---

## 10. セキュリティ

- Firestore Security Rules: 全コレクションで `allow read, write: if false;` — クライアントからの直接アクセスを完全禁止
- 全読み書きは Functions 経由のみ（サービスアカウントが Admin SDK で操作）
- 全 API: `verifyIdToken()` で認証必須
- ユーザーは自分の `userId` に紐づくデータのみ Functions 内でフィルタリング

---

## 11. 非対象（MVP外）

- FCM 通知
- LINE Login
- カスタム通知時間
- ダークモード
- 多人数管理
- 医療データ連携
- intake の削除・修正
