import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',

  // タイムアウト設定
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // リトライなし（CI でもシンプルに）
  retries: 0,

  // レポーター: CI では HTML、ローカルでは list
  reporter: process.env.CI ? [['html', { open: 'never' }]] : [['list']],

  use: {
    // 静的エクスポートを serve で配信
    baseURL: 'http://localhost:3000',
    // スクリーンショットは失敗時のみ
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  // chromium のみ
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  // npx serve で out/ を配信
  webServer: {
    command: 'npx serve out -l 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
