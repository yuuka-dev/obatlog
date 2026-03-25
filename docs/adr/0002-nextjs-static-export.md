# ADR-0002: Next.js 静的エクスポート（SSG）採用

## ステータス
承認

## コンテキスト
ObatLog は PWA として動作する SPA。サーバーサイドでの動的レンダリングは不要で、Firebase Hosting で配信したい。

## 決定
`next.config.mjs` で `output: 'export'` を設定し、ビルド時に静的 HTML/JS/CSS を生成。Firebase Hosting で配信し、API は Firebase Functions で提供する。

## 理由
- Firebase Hosting は静的ファイル配信に最適化されており、CDN 経由で高速に配信できる
- SSR 用のサーバーが不要なため、ホスティングコストがほぼゼロ
- Serwist (Service Worker) と組み合わせてオフライン対応が容易
- Vercel 等の外部サービスへの依存を避け、Firebase エコシステム内で完結できる

## 代替案
- **SSR（Vercel / Cloud Run）**: 動的レンダリングが可能だが、サーバーコストが発生し、Firebase Hosting との二重管理になる
- **CSR SPA（Vite 等）**: Next.js のルーティング・画像最適化・ビルド最適化の恩恵を受けられない

## 影響
- `getServerSideProps` / Route Handlers など SSR 専用機能は使用不可
- 動的 OGP が必要になった場合は別途対応が必要
