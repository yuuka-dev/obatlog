# ObatLog

[![CI](https://github.com/yuuka-dev/obatlog/actions/workflows/ci.yml/badge.svg)](https://github.com/yuuka-dev/obatlog/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> **過量チェックもできる服薬記録アプリ**。薬の "飲んだ" を記録し、過量（OD）を防止する個人向けツール。

## 概要

### なぜ作ったのか

精神科の薬を服用していると、「今日もう飲んだっけ？」「何錠飲んだっけ？」という場面が日常的に起こる。飲み忘れも過量摂取も、どちらも体調に直結する問題。既存のアプリは多機能すぎたり、医療従事者向けだったりして、個人がサクッと使えるものが少なかった。

ObatLog は医療機器レベルを目指すのではなく、**個人の生活改善ツール**として「記録する」「飲みすぎを防ぐ」「飲み忘れを通知する」の3つに絞ったシンプルな服薬記録アプリ。

## 主な機能

- 服薬記録（飲んだ錠数 + Undo）
- 薬の登録（名前、1日上限、通知設定）
- 1日上限チェック（OD防止）
- OD記録（気分タグ + メモ）
- 過去ログ表示（直近30件、日付グルーピング）
- 通知（FCM プッシュ + メール）
- PWA対応（オフライン動作）
- 多言語対応（日本語・英語・インドネシア語）
- レスポンシブ（モバイル: タブナビ / デスクトップ: サイドバー）

## 技術スタック

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| フレームワーク | Next.js (App Router) | SSG / 静的エクスポート |
| UI | React + Tailwind CSS | コンポーネント + スタイリング |
| PWA | Serwist (@serwist/next) | Service Worker、オフラインキャッシュ |
| 認証 | Firebase Auth | メール/パスワード認証 |
| DB | Firestore | NoSQL ドキュメントベース |
| API | Firebase Functions v2 (Express) | REST API (asia-northeast1) |
| 通知 | FCM + Microsoft Graph API | Web Push / メール通知 |
| ホスティング | Firebase Hosting | 静的エクスポート配信 |
| 言語 | TypeScript | フロント・バックエンド共通 |

## アーキテクチャ

Next.js で静的エクスポートした SPA を Firebase Hosting で配信し、全データ操作は Firebase Functions v2（Express）経由で Firestore にアクセスする構成。クライアントからの Firestore 直接アクセスは全拒否し、API は Firebase Auth の ID トークン検証を必須としている。

詳細は [docs/architecture.md](docs/architecture.md) を参照。

## はじめ方

### 前提条件

- Node.js 22+（フロントエンド）/ Node.js 20+（Functions）
- Firebase CLI
- Firebase プロジェクト

### セットアップ

```bash
git clone https://github.com/yuuka-dev/obatlog.git
cd obatlog
npm install
cp .env.example .env.local  # Firebase 設定を記入
npm run dev
```

Functions:

```bash
cd functions
npm install
npm run build
```

## ライセンス

独自ライセンス（EULA）。詳細は [LICENSE](LICENSE)（英語）/ [LICENSE-ja](LICENSE-ja)（日本語）を参照。
