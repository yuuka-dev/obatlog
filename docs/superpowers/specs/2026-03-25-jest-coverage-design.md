# Jest カバレッジ設定 + CI レポート出力 設計

Issue: #11

## 概要

Functions の Jest テストにカバレッジ計測を追加し、CI の PR コメントにカバレッジサマリを自動表示する。
カバレッジ閾値は100%に設定する（#14 完了まで CI は赤）。

## 変更対象

### 1. `functions/jest.config.js`

カバレッジ設定を追加:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
```

- `collectCoverage` は設定ファイルに入れない（ローカルで毎回カバレッジが走るのを防ぐ）
- CI では `--coverage` フラグで明示的に有効化する
- `json-summary`: PR コメント用 Action が読む形式
- `text`: ターミナル出力用
- `lcov`: HTML レポート生成用

### 2. `.github/workflows/ci.yml`

functions job を拡張。`ArtiomTr/jest-coverage-report-action` にテスト実行を委譲する:

```yaml
functions:
  runs-on: ubuntu-latest
  permissions:
    pull-requests: write
    checks: write
  defaults:
    run:
      working-directory: functions
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
        cache-dependency-path: functions/package-lock.json
    - run: npm ci
    - run: npm run build
    - run: npm test -- --coverage
    - uses: ArtiomTr/jest-coverage-report-action@v2
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        working-directory: functions
        skip-step: all
```

- `skip-step: all`: テスト実行は前ステップで完了済みのためスキップ
- `permissions`: PR コメント書き込みに `pull-requests: write` が必要
- Action は `functions/coverage/` 配下のレポートを自動検出する

### 3. ルートの `.gitignore`

既存の `functions/lib/` 等と同じくルートで管理する:

```
functions/coverage/
```

## 閾値方針

- #11 で100%閾値を設定（CI は赤になる）
- #14 で未テストファイルのテスト追加後、CI が緑になる
- 以降100%を維持

## 影響範囲

- functions の Jest 設定のみ
- フロントエンドは #12 で別途対応
