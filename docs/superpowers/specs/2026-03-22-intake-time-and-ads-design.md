# 服薬時刻表示 + 広告表示 設計書

## 1. 服薬時刻表示

### 概要
ログ一覧（LogList）の各エントリに服薬時刻を表示する。`takenAt` フィールドは既に Firestore に保存されており、フロントにも送信されているが、表示されていない。

### 変更内容

**ファイル: `src/components/LogList.tsx`**

各 intake エントリの右側に時刻を表示:
```
┌──────────────────────────────────┐
│ ロキソニン                 14:05 │
│ 1 錠 — 累計 2 / 3               │
└──────────────────────────────────┘
```

- `takenAt.seconds` を `HH:MM` 形式（Asia/Tokyo）に変換
- 日付の各グループ内では新しい時刻が上

### フォーマット処理
`takenAt.seconds * 1000` → `Date` → `toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })`

inline で処理。ヘルパー関数の追加は不要（1行で済む）。

---

## 2. 広告表示

### 概要
Google AdSense のバナー広告を全認証画面に常時表示する。`users` コレクションに `adFree` フラグを追加し、`true` の場合は広告非表示。

CLAUDE.md 更新済み: 「スマホ: TabNav下に固定バナー、PC: サイドバー下。全認証画面で常時表示。ランディングページには入れない」

### 広告配置

**スマホ（< 768px）**: TabNav の下に固定バナー
```
┌─────────────────┐
│   コンテンツ      │
├─────────────────┤
│ 🏠  💊  📋  ⚙️  │ ← TabNav
├─────────────────┤
│   広告 (320x50)  │ ← 最下部固定
└─────────────────┘
```

**PC（≥ 768px）**: サイドバーの下部にバナー
```
┌──────┬──────────────┐
│ Nav  │              │
│      │  コンテンツ    │
│──────│              │
│ 広告  │              │
└──────┴──────────────┘
```

**ランディングページ（未ログイン）**: 広告なし

### データモデル変更

**users コレクション追加フィールド:**
- `adFree: boolean` (デフォルト: `false`)

**UserProfile インターフェース更新:**
```typescript
export interface UserProfile {
  id: string;
  email: string;
  language: 'ja' | 'en' | 'id';
  notificationToken?: string;
  adFree: boolean;
}
```

### コンポーネント設計

**AdBanner コンポーネント（新規）: `src/components/AdBanner.tsx`**
- Google AdSense の固定バナー広告（320x50）をレンダリング
- AdSense の `<ins>` タグ + `adsbygoogle.push()` パターン
- 開発環境（localhost）ではグレーのプレースホルダーを表示
- AdSense 読み込み失敗時はエラーを握りつぶし、何も表示しない

**AppLayout の変更:**
- `adFree` フラグを `getMe()` から取得（state で管理）
- `getMe()` が失敗した場合は `adFree = false`（広告表示）として扱う
- `adFree === false` の場合のみ `AdBanner` を表示
- スマホ: TabNav の下に `AdBanner` を配置
- PC: SideNav に `adFree` props を渡し、SideNav 内の最下部に `AdBanner` を配置
- スマホの余白: `pb-20` → `pb-32`（TabNav + 広告バナー分）

### AdSense 設定
- 広告ユニット: 固定サイズ `320x50`（モバイルバナー）
- AdSense の `<script>` タグは `src/app/layout.tsx` に追加
- AdSense クライアントID: 環境変数 `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- 広告ユニットID: 環境変数 `NEXT_PUBLIC_ADSENSE_SLOT_ID`
- `.env` に追加（AdSense 審査通過後に値を設定）:
  ```
  NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXX
  NEXT_PUBLIC_ADSENSE_SLOT_ID=XXXXXXXXXX
  ```
- 環境変数が未設定の場合は広告を表示しない（AdSense 審査前でもビルドが通る）

### Functions 側の変更

**`functions/src/users.ts`**
- `GET /v1/users/me` のレスポンスに `adFree` フィールドを含める
- 遅延初期化時のデフォルト値: `adFree: false`

### 非表示条件
- `adFree === true` のユーザー
- 未ログイン（ランディングページ）
- AdSense 環境変数が未設定
- AdSense スクリプト読み込み失敗時
