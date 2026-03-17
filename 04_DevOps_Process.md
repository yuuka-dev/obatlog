# 04_DevOps_Process.md
# Azure DevOps 開発プロセス – ObatLog

---

## 1. Boards（タスク管理）
- 要件は User Story で登録
- Tasks は AI（ClaudeCode）が自動分割しても良い
- 人間が優先度を決定

---

## 2. Repos（ソース管理）
- main ブランチは保護
- すべて PR 経由
- PR には AI が自動生成した diff を添付

---

## 3. Pipelines（CI）
- Build（Astro）
- Lint（ESLint or Biome）
- Functions deploy dry-run
- 成功後、人間が Deploy 実施

---

## 4. AI 利用フロー
### AI Roles
- ClaudeCode：詳細設計＋実装
- Copilot：補助

### 開発フロー
1. Issue 作成
2. ClaudeCode に「実装開始プロンプト」を送る
3. AI がコード生成
4. PR を作成
5. 人間がレビュー＆Merge

---

## 5. Branch Rules
- main：保護 / 手動デプロイ
- feature/*：ClaudeCode が作る