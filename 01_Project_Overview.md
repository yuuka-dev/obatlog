# 01_Project_Overview.md
# Project: ObatLog
# Subtitle: 過量チェックもできる服薬記録アプリ
# Repository: Azure DevOps (osaka29.jp private)

---

## 1. プロジェクト概要

ObatLog は、個人向けの「服薬記録・過量チェック・通知」を備えた  
シンプルかつ軽量な Web アプリ（PWA）である。

本プロジェクトは Azure DevOps 上で管理し、  
AI（ClaudeCode / Copilot）と人間が共同で開発する。

---

## 2. 目的（Purpose）
- 服薬の “飲んだ” を記録し可視化する  
- 過量（OD）をチェックして防ぐ  
- 飲み忘れを通知で防止する  
- PWA によりスマートフォンアプリのように利用可能にする  
- インストール不要で即利用できる

---

## 3. 対象ユーザー
- 個人利用者  
- 一般的な服薬管理を行いたい層  
- 薬の飲み忘れや飲みすぎが気になる人  

※ 医療機器・医療従事者向けではない

---

## 4. スコープ
- 服薬記録  
- 過量チェック  
- 通知（Web Push）  
- 薬リスト  
- ログ一覧  
- ログイン（Firebase Auth / LINE optional）

---

## 5. 非スコープ
- 医療機器としての診断行為  
- 多人数の服薬管理  
- カレンダー同期  
- 電子お薬手帳との連携

---

## 6. 成果物
- PWA Web アプリ (obatlog.osaka29.jp)
- Firebase Functions (通知、上限チェック)
- Github Actions (CI)
- ドキュメント一式