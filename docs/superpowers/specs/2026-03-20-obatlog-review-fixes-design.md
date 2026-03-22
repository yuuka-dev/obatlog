# ObatLog レビュー改善 詳細設計書
**日付:** 2026-03-20
**ステータス:** ドラフト
**ベース:** [総合レビュー 2026-03-20](../../review-2026-03-20.md) + [MVP設計書 2026-03-17](2026-03-17-obatlog-mvp-design.md)

---

## 1. スコープ

レビューで検出された全23課題 + 新規OD記録機能。

| カテゴリ | 対象 |
|---|---|
| 過量チェック信頼性 | A-1（トランザクション化）、B-1（日付ずれ） |
| UI/UX改善 | A-2〜A-6、B-2〜B-3、B-6〜B-7、C-7〜C-9 |
| LP + レスポンシブ | A-4（LP）、A-6（PC版UI） |
| 記録取り消し | A-3（ソフトデリート + Toast） |
| OD記録 | 新規（intakes拡張 + 気分タグ + メモ） |
| セキュリティ | C-1〜C-4 |
| バックエンド最適化 | C-5（getUser削除） |
| テスト | C-6 |
| PWA | A-5（manifest）、B-4（リライト）、B-5（indexes）、C-10（オフライン） |
| FCM通知 | 新規（薬ごと通知設定） |

---

## 2. システムアーキテクチャ変更

### 2.1 Firestore データモデル（差分）

**新規コレクション: `dailyCounts/{uid}_{medicationId}_{dateKey}`**

```
- userId: string
- medicationId: string
- dateKey: string             # "YYYY-MM-DD"
- total: number               # トランザクションで原子更新
```

目的: 過量チェックのレースコンディション解消（A-1）。`runTransaction` でカウンターを原子更新する。

※ `dailyCounts` はドキュメントIDで直接参照するため、コレクションクエリは発生しない。Firestore インデックスは不要。IDの区切り文字 `_` は、`uid` と `medicationId`（Firestore auto-ID）には `_` が含まれないため衝突しない。

**変更: `intakes/{intakeId}`（既存に追加）**

```
+ cancelled: boolean          # ソフトデリートフラグ（デフォルト false）
+ isOdLog: boolean            # OD記録フラグ（デフォルト false）
+ moodTags: string[]          # 気分タグ（isOdLog時、任意）
+ memo: string                # メモ（isOdLog時、任意）
```

**変更: `medications/{medicationId}`（既存に追加）**

```
+ notifyEnabled: boolean      # 通知ON/OFF（デフォルト false）
+ notifyAt: string[]          # 通知時刻リスト（例: ["08:00", "18:00"]）
```

### 2.2 API エンドポイント変更

**変更:**

| メソッド | パス | 変更内容 |
|---|---|---|
| POST | /v1/intakes | `isOdLog`, `moodTags`, `memo` を任意フィールドとして追加。トランザクション化 |
| GET | /v1/intakes | `cancelled: true` のレコードを除外（デフォルト） |
| PUT | /v1/medications/:id | `notifyEnabled`, `notifyAt` を更新可能フィールドに追加 |

**新規:**

| メソッド | パス | 説明 |
|---|---|---|
| PATCH | /v1/intakes/:id | 取り消し（`cancelled: true` + dailyCounts 減算） |

**CORS ポリシー変更:** 許可メソッドに `PATCH` を追加。`GET, POST, PUT, PATCH, DELETE, OPTIONS`。

### 2.3 過量チェック 新フロー（A-1 修正）

```
POST /v1/intakes:
  1. verifyToken → uid
  2. medication 取得 → name, limitPerDay
  3. dateKey をサーバー側で生成
  4. runTransaction:
     a. dailyCounts/{uid}_{medId}_{dateKey} を get
     b. newTotal = (existing.total ?? 0) + takenUnits
     c. dailyCounts を set({ userId, medicationId, dateKey, total: newTotal })
     d. isOverdose = newTotal > limitPerDay
     e. intakes に add（全フィールド）
  5. レスポンス: { intakeId, isOverdose, totalToday, dateKey }
```

`dateKey` をレスポンスに含めることで、クライアント/サーバー日付ずれ問題（B-1）も解消。クライアントはレスポンスの `dateKey` でフィルタする。

### 2.4 取り消しフロー（A-3）

```
PATCH /v1/intakes/:id:
  1. verifyToken → uid
  2. intake ドキュメント取得、userId 照合
  3. already cancelled チェック
  4. runTransaction:
     a. intake の cancelled を true に更新
     b. dailyCounts/{uid}_{medId}_{dateKey} の total を takenUnits 分減算
        newTotal = Math.max(0, existing.total - intake.takenUnits)  # 負数防止
  5. レスポンス: 204
```

### 2.5 intakes GET の cancelled 除外

```
GET /v1/intakes:
  全クエリに .where('cancelled', '==', false) を追加。
  マイグレーションスクリプトで既存レコードに cancelled: false をセット済み前提。

  パターン1: 日付指定（ホーム画面）
    .where('userId', '==', uid)
    .where('cancelled', '==', false)
    .where('dateKey', '==', dateKey)
    .orderBy('takenAt', 'asc')
    → インデックス: userId + cancelled + dateKey + takenAt(asc)

  パターン2: 直近N件（ログ画面）
    .where('userId', '==', uid)
    .where('cancelled', '==', false)
    .orderBy('takenAt', 'desc')
    .limit(n)
    → インデックス: userId + cancelled + takenAt(desc)
```

---

## 3. LP + レスポンシブ設計

### 3.1 ランディングページ

**ルーティング:**
- 未認証で `/` → LP表示（`src/pages/index.astro` で認証状態により出し分け、または `/lp.astro` を別ページにして未認証時リダイレクト）
- 設計方針: `src/pages/index.astro` 内で認証状態を判定し、未認証なら LP コンポーネント、認証済みなら IntakeForm を表示。SSR不要（クライアント側で判定）。

**LP構成（1ページ・スクロール型）:**

1. **ヒーロー**
   - アプリ名「ObatLog」
   - キャッチコピー（i18n対応、例: 「お薬の記録、かんたんに。」）
   - 「無料で始める」ボタン → `/login`
   - パステルカラー背景、やわらかい丸みのあるデザイン

2. **特徴紹介（3カード）**
   - 💊 かんたん服薬記録: 1タップで飲んだを記録
   - ⚠️ やさしい過量チェック: 飲みすぎたらそっとお知らせ
   - 🔔 飲み忘れ通知: 設定した時間にリマインド

3. **使い方（3ステップ）**
   - Step 1: 薬を登録
   - Step 2: 飲んだら記録
   - Step 3: 安心して過ごす

4. **スクリーンショット**
   - アプリ画面のモック（1-2枚）
   - スマホフレーム内に表示

5. **CTA**
   - 「無料で始める」ボタン → `/login`
   - 「PWAだからインストール不要」テキスト

**デザインテイスト:**
- パステルカラー（アンバー系アクセント維持）
- 角丸多用（rounded-2xl 以上）
- やわらかいグラデーション背景
- 安心感重視のトーン

### 3.2 レスポンシブレイアウト（AppLayout）

**新規: `src/components/AppLayout.tsx`**（React Island）

```
モバイル（< 768px）:
  ┌──────────────┐
  │  ページヘッダー  │
  │              │
  │  メインコンテンツ │
  │  (max-w-full) │
  │              │
  ├──────────────┤
  │ 🏠  💊  📋  │  ← ボトムタブ（TabNav）
  └──────────────┘

PC（>= 768px）:
  ┌──────────┬──────────────────────┐
  │ サイドバー  │                      │
  │          │   メインコンテンツ        │
  │ 🏠 ホーム  │   (max-w-2xl mx-auto) │
  │ 💊 薬    │                      │
  │ 📋 ログ   │                      │
  │          │                      │
  │──────────│                      │
  │ 今日の状況  │                      │
  │ 薬A 2/3錠 │                      │
  │ 薬B 1/2錠 │                      │
  │          │                      │
  └──────────┴──────────────────────┘
```

- `md:` ブレークポイント（768px）で切り替え
- ボトムタブ: モバイルのみ表示（`md:hidden`）
- サイドバー: PCのみ表示（`hidden md:flex`）
- サイドバー幅: `w-56`（224px）
- サイドバー下部「今日の状況」: 各薬の累計/上限をミニプログレスバーで表示
- メインコンテンツ: `max-w-2xl mx-auto` で中央配置
- 既存の TabNav.tsx はモバイル用として残し、AppLayout 内で条件表示

**サイドバーのデータ取得戦略:**
- AppLayout 内で独自に `GET /v1/medications` + `GET /v1/intakes?dateKey=今日` を呼び出す（PC表示時のみ）
- ホーム画面との重複取得を許容する（シンプルさ優先、API呼び出しコストは軽微）
- PC/モバイル判定は `matchMedia('(min-width: 768px)')` を `useEffect` + `change` イベントリスナーで監視。リサイズにも追従する。SSR時は `false`（モバイル扱い）でフォールバック

**各ページの変更:**
- `index.astro`, `medications.astro`, `logs.astro` → AppLayout で囲む
- `login.astro` → AppLayout 不使用（ログイン前なのでサイドバー不要）

---

## 4. OD記録機能

### 4.1 データモデル

intakes コレクションに統合（セクション2.1参照）。通常の服薬記録と同じコレクションで、`isOdLog: true` で区別。

### 4.2 API

`POST /v1/intakes` のリクエストボディ拡張:
```json
{
  "medicationId": "string",
  "takenUnits": 10,
  "isOdLog": true,
  "moodTags": ["つらい", "眠れない"],
  "memo": "衝動的に飲んでしまった"
}
```

バリデーション:
- `isOdLog` が true の場合:
  - `takenUnits` の上限チェックなし（OD記録なので制限不要）
  - `moodTags`: 最大5個、各タグ50文字以下
  - `memo`: 500文字以下
- `isOdLog` が false（通常記録）の場合:
  - `takenUnits`: 1-99
  - `moodTags`, `memo` は無視

**OD記録と dailyCounts の関係:**
- `isOdLog: true` の記録は `dailyCounts` に**加算しない**。OD記録は「すでに飲んでしまった事実の記録」であり、通常の過量チェックフローとは別の文脈。
- OD記録後に通常の服薬記録をしても、dailyCounts は OD 分を含まないため、正常に過量チェックが動作する。
- OD記録自体の `isOverdose` フィールドは常に `true` をセットする（定義上、ODは過量）。
- `totalToday` は dailyCounts の値（OD分を含まない）をセットする。

### 4.3 UI

**ホーム画面:**
- 薬一覧の下に「ODしちゃった」ボタン
  - スタイル: 控えめ（`bg-gray-100 text-gray-500` 程度、目立ちすぎない）
  - タップ → インライン展開（モーダルではない、ページ遷移もしない）

**OD記録フォーム（展開時）:**
```
┌─────────────────────────┐
│ 📝 ODの記録              │
│                         │
│ 薬: [プルダウン ▼]       │
│ 錠数: [- 10 +]          │
│                         │
│ 気分（複数選べるよ）:      │
│ [つらい] [不安] [眠れない] │
│ [衝動的に] [イライラ]     │
│ [覚えてない]             │
│                         │
│ メモ（任意）:             │
│ ┌───────────────────┐   │
│ │                   │   │
│ └───────────────────┘   │
│                         │
│    [記録する]  [やめる]    │
└─────────────────────────┘
```

**記録後メッセージ:** 「記録したよ。無理しないでね。」（i18n対応）

**ログ画面での表示:**
- `isOdLog: true` の記録はやわらかい色（薄いパープル or 薄いアンバー）の左ボーダーで区別
- 気分タグをチップ表示
- メモがあれば本文下に表示

### 4.4 気分タグ プリセット（i18n）

| ja | en | id |
|---|---|---|
| つらい | Struggling | Sedih |
| 不安 | Anxious | Cemas |
| 眠れない | Can't sleep | Tidak bisa tidur |
| 衝動的に | Impulsive | Impulsif |
| イライラ | Irritated | Kesal |
| 覚えてない | Don't remember | Tidak ingat |

---

## 5. フロントエンド改善

### 5.1 ステッパー化（B-3）

number input を +/- ステッパーボタンに置き換え。

- 通常記録: min=1, max=limitPerDay
- OD記録: min=1, max なし
- NaN ガード: `parseInt` 結果が `NaN` の場合は 1 にフォールバック
- ボタンサイズ: w-10 h-10（44x44pt以上）

### 5.2 ダブルタップ防止（A-2）

- 薬ごとの `submitting: Record<string, boolean>` state
- 送信中: `disabled` + ボタンテキストを「...」に
- ボタンサイズ: `px-5 py-3`（タッチターゲット拡大）

### 5.3 Toast + 取り消し（A-3）

- 記録成功後、画面下部（ボトムタブの上）に Toast 表示
- 表示時間: 5秒
- 内容: 「{薬名} を記録しました」+ 「取り消し」ボタン
- 取り消し → `PATCH /v1/intakes/:id` → dailyCounts 減算 → ローカル state 更新
- Toast はスタック可能（複数記録した場合）

### 5.4 累計プログレスバー（C-7）

```
[████████░░░░] 2/3 錠
```

- `text-xs text-gray-400` → プログレスバー + `text-sm text-gray-600 font-medium`
- 通常: アンバー系バー
- 上限到達: アンバー背景のカード（赤は使わない）

### 5.5 服薬完了可視化（C-9）

全薬が上限到達 → カード上部にメッセージ表示。

```
┌─────────────────────────┐
│ ✨ 今日のお薬は完了だよ    │
└─────────────────────────┘
```

やわらかい緑系（`bg-green-50 text-green-700`）。

### 5.6 過量警告クリア漏れ修正（B-2）

`handleTake` 冒頭で `setOverdoseMsg('')` を追加。別の薬を記録した際に前回の警告が残らないようにする。

### 5.7 エラーハンドリング改善（B-6）

- `IntakeForm.tsx` useEffect 内: try-catch + エラー state + 「データの取得に失敗しました。再読み込みしてください。」表示
- `MedicationList.tsx` handleDelete: try-catch + Toast でエラー表示

### 5.8 i18n ハードコード修正（B-7）

- `LogList.tsx` 33行: 「ホームから記録する →」→ `t('empty.logs.goHome', lang)`
- `LogList.tsx` 63行: 「累計」→ `t('logs.total', lang)`
- 各言語の json に対応キーを追加

### 5.9 タッチターゲット拡大（C-8）

- 薬リストの編集/削除ボタン: `p-2` 以上
- 言語切替ボタン: `px-3 py-2`
- 全操作ボタン: 最低 44x44pt

---

## 6. セキュリティ・インフラ改善

### 6.1 セキュリティヘッダー（C-1）

`firebase.json` の hosting に headers セクション追加:

```json
{
  "hosting": {
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
  }
}
```

CSP は Firebase Auth SDK の要件に合わせて慎重に設定（`googleapis.com`, `firebaseio.com` を許可）。

### 6.2 入力バリデーション強化（C-2）

| フィールド | 制限 |
|---|---|
| medications.name | 1-100文字 |
| medications.limitPerDay | 1-99（正整数） |
| intakes.takenUnits（通常） | 1-99（正整数） |
| intakes.takenUnits（OD） | 1-999（現実的な範囲に制限） |
| intakes.memo | 0-500文字 |
| intakes.moodTags | 最大5個、各50文字以下 |

### 6.3 express.json 制限（C-3）

```typescript
app.use(express.json({ limit: '10kb' }));
```

### 6.4 firebase.json 修正（B-4）

SPA リライトルール削除。Astro static は各ページ個別 HTML を生成するため、Firebase Hosting のデフォルト挙動で解決。

### 6.5 firestore.indexes.json 作成（B-5）

```json
{
  "indexes": [
    {
      "collectionGroup": "medications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "intakes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "medicationId", "order": "ASCENDING" },
        { "fieldPath": "dateKey", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "intakes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "cancelled", "order": "ASCENDING" },
        { "fieldPath": "dateKey", "order": "ASCENDING" },
        { "fieldPath": "takenAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "intakes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "cancelled", "order": "ASCENDING" },
        { "fieldPath": "takenAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**注意:** `medications` コレクションの FCM 通知用クエリ（`notifyEnabled == true` + `array-contains notifyAt`）は Firestore が自動で単一フィールドインデックスを使用するため、複合インデックスの明示的定義は不要（`array-contains` + `==` は自動マージされる）。

### 6.6 users.ts 最適化（C-5）

`verifyToken` ミドルウェアで `decoded.email` もリクエストに付与。`GET /v1/users/me` での `admin.auth().getUser(uid)` 呼び出しを削除。

```typescript
// middleware/auth.ts 変更
interface AuthenticatedRequest extends Request {
  uid: string;
  email: string;  // 追加
}

// verifyToken 内
req.uid = decoded.uid;
req.email = decoded.email ?? '';  // 追加
```

### 6.7 レート制限（C-4）

MVP段階: Firebase App Check の基本導入（`enforceAppCheck: true` をFunctions に設定）。
クライアント: `initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey) })`。

---

## 7. PWA 改善

### 7.1 manifest 修正（A-5）

```javascript
// astro.config.mjs
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'ObatLog',
    short_name: 'ObatLog',
    description: '服薬記録・過量チェックアプリ',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

### 7.2 Workbox runtimeCaching（C-10）

```javascript
// astro.config.mjs
VitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/asia-northeast1-obatlog\.cloudfunctions\.net\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1時間
          },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
})
```

オフライン時: キャッシュがあればそれを表示。なければ「オフラインです。接続を確認してください。」バナーを表示。

---

## 8. FCM 通知（薬ごと設定）

### 8.1 データモデル

medications に `notifyEnabled` + `notifyAt` を追加（セクション2.1参照）。

### 8.2 通知登録フロー

1. ユーザーがブラウザの通知許可を付与
2. FCM トークンを取得 → `PUT /v1/users/me` で `notificationToken` に保存
3. 薬編集画面で通知を有効化 + 時刻設定

### 8.3 通知送信フロー

Cloud Scheduler（毎時0分に起動）→ Firebase Function:
1. 現在時刻（JST）の「HH:00」を計算
2. `medications` を `notifyEnabled == true` かつ `notifyAt` に現在時刻を含むものをクエリ
3. 各薬の `userId` から `users` ドキュメントの `notificationToken` を取得
4. 当日の `dailyCounts` を確認し、まだ上限に達していない薬のみ通知
5. FCM で Push 送信: 「{薬名} の時間だよ」

### 8.4 通知設定 UI

薬編集フォーム（MedicationForm.tsx）に追加:

```
┌─────────────────────────┐
│ 薬の名前: [ロラゼパム  ]  │
│ 1日上限:  [- 3 +] 錠    │
│                         │
│ 🔔 通知: [ON]           │
│ 時刻:                   │
│   08:00 [×]             │
│   18:00 [×]             │
│   [+ 時刻を追加]         │
└─────────────────────────┘
```

- 通知 ON/OFF トグル
- 時刻は `<select>` プルダウンで選択（00:00〜23:00 の24択。Cloud Scheduler が毎時0分起動のため、1時間単位のみ。`<input type="time">` は `step` のブラウザ互換性が不安定なため不使用）
- 各時刻に削除ボタン
- 最大 5 時刻まで

---

## 9. テスト拡充（C-6）

### 9.1 追加テストケース

**calcOverdose（純粋関数）:**
- previousTotal=3, takenUnits=1, limit=3 → isOverdose: true（既に上限到達後の追加）
- 大きな数値: previousTotal=999999, takenUnits=1, limit=1000000

**POST /v1/intakes（統合テスト）:**
- 正常記録（isOverdose: false）
- 過量記録（isOverdose: true）
- OD記録（isOdLog: true + moodTags + memo）
- medicationId 不正 → 404
- 他人の medication 参照 → 403
- takenUnits=0 → 400
- takenUnits 負数 → 400
- takenUnits 小数 → 400
- memo 500文字超 → 400

**PATCH /v1/intakes/:id（統合テスト）:**
- 正常取り消し → 204 + dailyCounts 減算確認
- 他人の intake 取り消し → 403
- 既に取り消し済み → 400
- 存在しない ID → 404

**POST /v1/medications（統合テスト）:**
- 正常登録
- name 空文字 → 400
- name 101文字 → 400
- limitPerDay=0 → 400
- limitPerDay=100 → 400
- limitPerDay=1.5 → 400

**PUT /v1/medications/:id:**
- 部分更新（name のみ / limitPerDay のみ）
- notifyEnabled + notifyAt の設定
- 他人の薬更新 → 403

**DELETE /v1/medications/:id:**
- 正常削除
- 他人の薬削除 → 403

**auth.test.ts 追加:**
- Authorization: Basic xxx（Bearer以外） → 401
- 空トークン → 401

### 9.2 テスト戦略

- 純粋関数: Jest ユニットテスト（現状の延長）
- HTTP ハンドラー: Firebase Emulator Suite を使った統合テスト
- フロントエンド: 現時点ではテストなし（MVP後に検討）

---

## 10. 既存データのマイグレーション

既存の intakes レコードに `cancelled` フィールドがないため:

1. デプロイ前に Firestore マイグレーションスクリプトを実行
2. 全 intakes ドキュメントに `cancelled: false`, `isOdLog: false` をセット
3. スクリプトは `functions/src/scripts/migrate-intakes.ts` として作成
4. 既存 dailyCounts は存在しないため、初回アクセス時に自動生成される設計（トランザクション内で `existing.total ?? 0` で対応）

**マイグレーション実行方法:**
```bash
# Emulator で動作確認
cd functions && npm run build
firebase emulators:start
npx ts-node src/scripts/migrate-intakes.ts --emulator

# 本番実行（サービスアカウントキーが必要）
export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
npx ts-node src/scripts/migrate-intakes.ts
```

スクリプトは Firebase Admin SDK を使用してサーバーサイドで実行する（Firestore Rules の deny-all を迂回）。

---

## 11. 過量警告の UX 方針（変更なし）

**MVP設計書から継続:**
- 色: 淡いアンバー / 黄色系（赤は使わない）
- アイコン: 💊 など穏やかなもの
- 文言: やさしいトーン
  - ja: 「今日はたくさん飲んだね。少し休んでね。」
  - en: "You've taken a lot today. Please take care."
  - id: "Kamu sudah minum banyak hari ini. Istirahat sebentar ya."

**強い警告・赤色・断定的表現は絶対に使わない。** 強い否定は逆効果であり、ユーザーの実体験に基づく方針。

---

## 12. ファイル構成（差分）

```
src/
├── pages/
│   ├── index.astro          # 変更: 未認証→LP / 認証済み→ホーム
│   └── ...
├── components/
│   ├── AppLayout.tsx         # 新規: レスポンシブレイアウト（サイドバー/ボトムタブ）
│   ├── LandingPage.tsx       # 新規: LP コンポーネント
│   ├── IntakeForm.tsx        # 変更: ステッパー、Toast、OD記録、ダブルタップ防止
│   ├── OdLogForm.tsx         # 新規: OD記録フォーム（IntakeForm内でインライン展開）
│   ├── Toast.tsx             # 新規: Toast通知コンポーネント
│   ├── Stepper.tsx           # 新規: +/- ステッパーコンポーネント
│   ├── ProgressBar.tsx       # 新規: 累計プログレスバー
│   ├── TabNav.tsx            # 変更: モバイルのみ表示
│   ├── SideNav.tsx           # 新規: PC用サイドナビ + 今日のサマリー
│   ├── MedicationForm.tsx    # 変更: 通知設定UI追加
│   ├── MedicationList.tsx    # 変更: エラーハンドリング改善
│   └── LogList.tsx           # 変更: OD記録の区別表示、i18n修正
├── api/
│   └── intakes.ts            # 変更: cancelIntake() 追加
├── i18n/
│   ├── ja.json               # 変更: OD記録、LP、気分タグ等のキー追加
│   ├── en.json               # 同上
│   └── id.json               # 同上

functions/
├── src/
│   ├── intakes.ts            # 変更: トランザクション化、PATCH追加、ODフィールド対応
│   ├── medications.ts        # 変更: 通知フィールド対応、バリデーション強化
│   ├── users.ts              # 変更: getUser() 削除
│   ├── middleware/auth.ts    # 変更: email もリクエストに付与
│   ├── notify.ts             # 新規: Cloud Scheduler 通知ハンドラー
│   └── scripts/
│       └── migrate-intakes.ts # 新規: 既存データマイグレーション

firestore.rules                # 変更なし（deny all 維持）
firestore.indexes.json         # 新規
firebase.json                  # 変更: ヘッダー追加、リライト削除
astro.config.mjs               # 変更: manifest修正、runtimeCaching追加
```

---

## 13. i18n 新規キー一覧

MVP設計書のキー命名規則（`namespace.element`、camelCase）に準拠。

```json
{
  "od.title": "ODの記録",
  "od.button": "ODしちゃった",
  "od.selectMedication": "薬を選んでね",
  "od.units": "錠",
  "od.moodLabel": "気分（複数選べるよ）",
  "od.memoLabel": "メモ（任意）",
  "od.submit": "記録する",
  "od.cancel": "やめる",
  "od.successMessage": "記録したよ。無理しないでね。",

  "moodTags.struggling": "つらい",
  "moodTags.anxious": "不安",
  "moodTags.cantSleep": "眠れない",
  "moodTags.impulsive": "衝動的に",
  "moodTags.irritated": "イライラ",
  "moodTags.dontRemember": "覚えてない",

  "toast.recorded": "{name} を記録しました",
  "toast.cancelled": "取り消しました",
  "toast.undo": "取り消し",
  "toast.error": "エラーが発生しました",

  "lp.hero.catchcopy": "お薬の記録、かんたんに。",
  "lp.hero.cta": "無料で始める",
  "lp.feature.record": "かんたん服薬記録",
  "lp.feature.recordDesc": "1タップで飲んだを記録",
  "lp.feature.check": "やさしい過量チェック",
  "lp.feature.checkDesc": "飲みすぎたらそっとお知らせ",
  "lp.feature.notify": "飲み忘れ通知",
  "lp.feature.notifyDesc": "設定した時間にリマインド",
  "lp.steps.register": "薬を登録",
  "lp.steps.record": "飲んだら記録",
  "lp.steps.relax": "安心して過ごす",
  "lp.pwa.note": "インストール不要、すぐ使える",

  "home.allComplete": "今日のお薬は完了だよ",
  "home.offline": "オフラインです。接続を確認してください。",
  "home.fetchError": "データの取得に失敗しました。再読み込みしてください。",

  "empty.logs.goHome": "ホームから記録する",
  "logs.total": "累計",

  "medications.notifyEnabled": "通知",
  "medications.notifyAt": "通知時刻",
  "medications.addTime": "時刻を追加",

  "sidebar.todaySummary": "今日の状況"
}
```

---

## 14. 非対象

- ダークモード
- LINE Login
- カレンダー連携
- 多人数管理
- 医療データ連携
