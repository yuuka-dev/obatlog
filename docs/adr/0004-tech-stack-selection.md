# ADR-0004: 技術スタック選定

## ステータス
承認

## コンテキスト
個人向け服薬記録アプリとして、開発コスト・将来の拡張性・ホスティング費用のバランスが取れた技術選定が必要。

## 決定

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| フレームワーク | Next.js (App Router) | 将来の拡張性が高い（SSG→SSR移行、API Routes追加等が容易） |
| UI | Tailwind CSS | ユーティリティファーストで高速開発。追加UIライブラリ不要 |
| 認証・DB・API | Firebase (Auth / Firestore / Functions v2) | 個人開発に最適な無料枠。認証・DB・APIホスティングが一体 |
| PWA | Serwist (@serwist/next) | Next.js との統合が容易。オフライン対応 |
| 言語 | TypeScript | フロント・バックエンド共通で型安全 |

## 理由

### Next.js
- App Router により、ページ単位のレイアウト・ローディング・エラーハンドリングが整理される
- 現在は SSG（静的エクスポート）だが、将来 SSR やサーバーコンポーネントへの移行パスがある
- React エコシステムの資産をそのまま活用できる
- Capacitor によるモバイルアプリ化との相性が良い

### Firebase
- 無料枠（Spark → Blaze 従量課金）が個人開発の規模に十分
- Auth・Firestore・Functions・Hosting が一つのプロジェクトで完結
- Functions v2 で Express が使え、REST API パターンを自然に実装できる

### Tailwind CSS
- コンポーネントごとにスタイルが完結し、CSS 肥大化を防ぐ
- デザインシステムなしでも一貫した見た目を維持しやすい

## 代替案
- **Remix / SvelteKit**: 優れたフレームワークだが、Firebase Hosting との統合やCapacitor対応でNext.jsに劣る
- **Supabase**: PostgreSQL ベースで強力だが、Firebase ほど無料枠が広くない
- **CSS Modules / styled-components**: スコープ付きCSSだが、Tailwind の方が記述量が少なく高速

## 影響
- Firebase にロックインされる（BaaS移行コストが高い）
- Next.js の静的エクスポートでは一部機能（ISR、ミドルウェア等）が使えない
