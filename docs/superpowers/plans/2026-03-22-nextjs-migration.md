# Astro → Next.js 移行プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Astro フロントエンドを Next.js (App Router, static export) に置き換える。Firebase Functions バックエンドはそのまま維持。

**Architecture:** Next.js App Router + static export (`output: 'export'`)。全ページは `'use client'` でクライアントサイドレンダリング。既存の React コンポーネント・lib・i18n・api 層はほぼそのまま移植。PWA は `@serwist/next` で対応（`next-pwa` は static export 非対応のため不採用）。ページは `src/app/` に配置（Next.js 慣例、import パス簡潔化）。

**Tech Stack:** Next.js 15, React 18 (明示固定), Tailwind CSS 3, @serwist/next, Firebase JS SDK (既存)

---

## ファイル構成

### 削除するファイル
- `src/pages/*.astro` (7ファイル) — Next.js の `src/app/` ルーティングに置き換え
- `src/env.d.ts` — Astro 固有の型定義
- `src/middleware.ts` — 空のプレースホルダー（不要）
- `astro.config.mjs` — Next.js の `next.config.mjs` に置き換え
- `tailwind.config.mjs` — `tailwind.config.ts` に置き換え

### 新規作成
- `next.config.mjs` — static export + PWA 設定
- `src/app/layout.tsx` — ルートレイアウト (html, head, body)
- `src/app/globals.css` — Tailwind ディレクティブ
- `src/app/page.tsx` — `/` (HomePage をレンダリング)
- `src/app/login/page.tsx` — `/login`
- `src/app/medications/page.tsx` — `/medications`
- `src/app/logs/page.tsx` — `/logs`
- `src/app/settings/page.tsx` — `/settings`
- `src/app/privacy/page.tsx` — `/privacy`
- `src/app/terms/page.tsx` — `/terms`
- `postcss.config.mjs` — Tailwind CSS 用
- `tailwind.config.ts` — content パス更新
- `public/manifest.json` — PWA マニフェスト

### 修正するファイル
- `package.json` — 依存関係を Astro → Next.js に入れ替え
- `tsconfig.json` — Next.js の設定に更新
- `.gitignore` — `.next/`, `out/` 追加
- `firebase.json` — `hosting.public` を `dist` → `out` に変更
- `.github/workflows/ci.yml` — env var 名更新
- `.github/workflows/cd.yml` — env var 名 + VAPID_KEY 追加
- `src/lib/firebase.ts` — `import.meta.env` → `process.env` に変更
- `src/lib/api.ts` — `import.meta.env` → `process.env` に変更
- `src/lib/notifications.ts` — `import.meta.env` → `process.env` に変更

### そのまま流用（変更不要）
- `src/components/*.tsx` (18ファイル) — React コンポーネントはそのまま使える
- `src/api/*.ts` — API ラッパーはそのまま
- `src/i18n/*` — i18n もそのまま
- `src/lib/auth.ts` — env 参照なし、変更不要
- `public/` — 静的アセット（firebase-messaging-sw.js 含む）はそのまま
- `functions/` — バックエンド完全に別、変更なし

---

## Task 1: プロジェクト初期化（Next.js セットアップ）

**Files:**
- Modify: `package.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Modify: `tsconfig.json`
- Modify: `.gitignore`

- [ ] **Step 1: 依存関係を入れ替え**

Astro 関連を削除、Next.js 関連を追加（React 18 を明示固定）:

```bash
npm uninstall astro @astrojs/react @astrojs/tailwind vite-plugin-pwa workbox-window
npm install next@latest react@18 react-dom@18
npm install -D @types/node autoprefixer
```

package.json の scripts を更新:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- [ ] **Step 2: next.config.mjs を作成**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
```

注意: PWA は Task 7 で追加する。まずは動くようにすることが最優先。

- [ ] **Step 3: postcss.config.mjs を作成**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: tailwind.config.ts を作成（旧 .mjs を置き換え）**

```bash
rm tailwind.config.mjs
```

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: tsconfig.json を Next.js 用に更新**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "functions"]
}
```

- [ ] **Step 6: .gitignore に Next.js エントリを追加**

追加するエントリ:
```
.next/
out/
next-env.d.ts
```

- [ ] **Step 7: 確認 — 依存関係インストールが正常**

```bash
npm ls next react react-dom
```

- [ ] **Step 8: コミット**

```bash
git add package.json package-lock.json next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json .gitignore
git commit -m "chore: Astro → Next.js 依存関係を入れ替え"
```

---

## Task 2: 環境変数を Next.js 形式に移行

**Files:**
- Modify: `src/lib/firebase.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/notifications.ts`
- Modify: `.env` (ローカルのみ、コミット対象外)

- [ ] **Step 1: .env のキーに NEXT_PUBLIC_ プレフィックスを追加**

`.env` のキーを更新:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FUNCTIONS_BASE_URL=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
```

- [ ] **Step 2: firebase.ts の env 参照を更新**

`import.meta.env.PUBLIC_` → `process.env.NEXT_PUBLIC_` に全置換:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
```

- [ ] **Step 3: api.ts の env 参照を更新**

`import.meta.env.PUBLIC_FUNCTIONS_BASE_URL` → `process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL`

- [ ] **Step 4: notifications.ts の env 参照を更新**

`import.meta.env.PUBLIC_FIREBASE_VAPID_KEY` → `process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY`

- [ ] **Step 5: コミット**

```bash
git add src/lib/firebase.ts src/lib/api.ts src/lib/notifications.ts
git commit -m "refactor: env 変数を Next.js 形式 (NEXT_PUBLIC_) に移行"
```

---

## Task 3: App Router ルートレイアウト作成

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: src/app/globals.css を作成**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: src/app/layout.tsx を作成**

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ObatLog',
  description: '服薬記録・過量チェックアプリ',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: コミット**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: Next.js App Router ルートレイアウト作成"
```

---

## Task 4: ページルーティング作成

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/medications/page.tsx`
- Create: `src/app/logs/page.tsx`
- Create: `src/app/settings/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`

各ページは `'use client'` を付与し、既存の React コンポーネントをそのまま呼び出す。
`src/app/` から `src/components/` への import は `@/components/...` エイリアスを使用。

- [ ] **Step 1: src/app/page.tsx（ホーム / ランディング）**

```tsx
'use client';
import HomePage from '@/components/HomePage';

export default function Page() {
  return <HomePage />;
}
```

- [ ] **Step 2: src/app/login/page.tsx**

```tsx
'use client';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 3: src/app/medications/page.tsx**

```tsx
'use client';
import AppLayout from '@/components/AppLayout';
import MedicationsPage from '@/components/MedicationsPage';

export default function Page() {
  return (
    <AppLayout active="medications">
      <MedicationsPage />
    </AppLayout>
  );
}
```

- [ ] **Step 4: src/app/logs/page.tsx**

```tsx
'use client';
import AppLayout from '@/components/AppLayout';
import LogsPage from '@/components/LogsPage';

export default function Page() {
  return (
    <AppLayout active="logs">
      <LogsPage />
    </AppLayout>
  );
}
```

- [ ] **Step 5: src/app/settings/page.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AppLayout from '@/components/AppLayout';
import SettingsPage from '@/components/SettingsPage';

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/login';
      } else {
        setAuthed(true);
      }
    });
    return () => unsub();
  }, []);

  if (!authed) return null;

  return (
    <AppLayout active="settings">
      <SettingsPage />
    </AppLayout>
  );
}
```

- [ ] **Step 6: src/app/privacy/page.tsx と src/app/terms/page.tsx**

既存の .astro ファイルに書かれた HTML を React コンポーネントとして書き直す。
privacy.astro と terms.astro の中身を読み取り、JSX に変換。
これらは純粋な静的コンテンツなので `'use client'` 不要（Server Component として build 時レンダリング）。
ただし `next/link` の `Link` コンポーネントでナビゲーションリンクを実装。

- [ ] **Step 7: 確認 — `npm run dev` でページ遷移が動くこと**

```bash
npm run dev
```

ブラウザで `/`, `/login`, `/medications`, `/logs`, `/settings` を確認。

- [ ] **Step 8: コミット**

```bash
git add src/app/
git commit -m "feat: Next.js ページルーティング作成（全ページ移植）"
```

---

## Task 5: Astro ファイル削除・クリーンアップ

**Files:**
- Delete: `src/pages/*.astro` (全7ファイル)
- Delete: `src/pages/` ディレクトリ
- Delete: `src/env.d.ts`
- Delete: `src/middleware.ts`
- Delete: `astro.config.mjs`

- [ ] **Step 1: Astro 固有ファイルを削除**

```bash
rm src/pages/index.astro src/pages/login.astro src/pages/logs.astro src/pages/medications.astro src/pages/privacy.astro src/pages/terms.astro src/pages/settings.astro
rm src/env.d.ts src/middleware.ts astro.config.mjs
rmdir src/pages
```

- [ ] **Step 2: ビルド確認**

```bash
npm run build
```

`out/` ディレクトリに静的ファイルが生成されることを確認。

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "refactor: Astro 固有ファイルを削除、Next.js に完全移行"
```

---

## Task 6: Firebase Hosting / CI/CD 更新

**Files:**
- Modify: `firebase.json` — `hosting.public` を `out` に変更
- Modify: `.github/workflows/ci.yml` — env var 名更新
- Modify: `.github/workflows/cd.yml` — env var 名 + VAPID_KEY 追加

- [ ] **Step 1: firebase.json の hosting.public を更新**

`"public": "dist"` → `"public": "out"` に変更。
SPA フォールバック用の rewrites を追加:

```json
"hosting": {
  "public": "out",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [
    { "source": "**", "destination": "/index.html" }
  ],
  "headers": [ ... ]
}
```

- [ ] **Step 2: CI workflow に env vars 追加**

CI でもビルドが通るように env vars を追加（GitHub Secrets から）:

```yaml
- run: npm run build
  env:
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_FUNCTIONS_BASE_URL: ${{ secrets.NEXT_PUBLIC_FUNCTIONS_BASE_URL }}
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_VAPID_KEY }}
```

- [ ] **Step 3: CD workflow の env var 名を更新 + VAPID_KEY 追加**

`PUBLIC_*` → `NEXT_PUBLIC_*` に変更し、`NEXT_PUBLIC_FIREBASE_VAPID_KEY` を追加:

```yaml
- run: npm run build
  env:
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_FUNCTIONS_BASE_URL: ${{ secrets.NEXT_PUBLIC_FUNCTIONS_BASE_URL }}
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_VAPID_KEY }}
```

- [ ] **Step 4: コミット**

```bash
git add firebase.json .github/workflows/ci.yml .github/workflows/cd.yml
git commit -m "chore: Firebase Hosting/CI/CD を Next.js static export に対応"
```

---

## Task 7: PWA 対応

**Files:**
- Modify: `next.config.mjs` — @serwist/next 追加
- Modify: `package.json` — @serwist/next 依存追加
- Create: `public/manifest.json` — PWA マニフェスト
- Create: `src/app/sw.ts` — Serwist サービスワーカー（API キャッシュ + FCM 統合）
- Modify: `src/app/layout.tsx` — SW 登録スクリプト追加

`next-pwa` は `output: 'export'` と互換性がないため、`@serwist/next` を使用する。
既存の Workbox runtimeCaching（API `/v1/` への NetworkFirst 戦略）もここで移植する。

注意: `public/firebase-messaging-sw.js` は FCM バックグラウンド通知用の別 SW として残す。
`notifications.ts` で明示的に `/firebase-messaging-sw.js` を登録しているため、PWA SW との競合はしない
（scope が異なるため共存可能）。

- [ ] **Step 1: @serwist/next をインストール**

```bash
npm install @serwist/next serwist
```

- [ ] **Step 2: next.config.mjs に Serwist 設定を追加**

```js
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
};

export default withSerwist(nextConfig);
```

- [ ] **Step 3: src/app/sw.ts を作成**

```ts
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    ...defaultCache,
    {
      urlPattern: /\/v1\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
  ],
});

serwist.addEventListeners();
```

- [ ] **Step 4: public/manifest.json を作成**

```json
{
  "name": "ObatLog",
  "short_name": "ObatLog",
  "description": "服薬記録・過量チェックアプリ",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 5: ビルド確認**

```bash
npm run build
```

`public/sw.js` が生成されることを確認。

- [ ] **Step 6: コミット**

```bash
git add next.config.mjs package.json package-lock.json public/manifest.json src/app/sw.ts
git commit -m "feat: @serwist/next で PWA 対応（API キャッシュ移植）"
```

---

## Task 8: 動作確認・最終クリーンアップ

- [ ] **Step 1: ローカルで全画面動作確認**

```bash
npm run build && npx serve out
```

確認項目:
- `/` — ランディング or ホーム表示
- `/login/` — ログインフォーム表示
- `/medications/` — 薬リスト（要ログイン）
- `/logs/` — ログ一覧（要ログイン）
- `/settings/` — 設定画面（要ログイン）
- `/privacy/`, `/terms/` — 静的ページ表示
- 認証フローが正常に動作
- PWA: SW 登録、オフライン API キャッシュ

- [ ] **Step 2: 不要ファイルの確認**

Astro 関連の残骸がないか確認:
```bash
grep -r "astro" --include="*.ts" --include="*.tsx" --include="*.json" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=functions
```

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: Next.js 移行完了、最終クリーンアップ"
```

---

## GitHub Secrets 更新メモ（手動作業）

CI/CD の env var 名を `PUBLIC_*` → `NEXT_PUBLIC_*` に変更するため、GitHub Secrets のリネームが必要:

| 旧名 | 新名 |
|------|------|
| PUBLIC_FIREBASE_API_KEY | NEXT_PUBLIC_FIREBASE_API_KEY |
| PUBLIC_FIREBASE_AUTH_DOMAIN | NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN |
| PUBLIC_FIREBASE_PROJECT_ID | NEXT_PUBLIC_FIREBASE_PROJECT_ID |
| PUBLIC_FIREBASE_APP_ID | NEXT_PUBLIC_FIREBASE_APP_ID |
| PUBLIC_FUNCTIONS_BASE_URL | NEXT_PUBLIC_FUNCTIONS_BASE_URL |
| PUBLIC_FIREBASE_VAPID_KEY | NEXT_PUBLIC_FIREBASE_VAPID_KEY |

これは GitHub UI から手動で行う。
