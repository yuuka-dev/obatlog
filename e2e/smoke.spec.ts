import { test, expect } from '@playwright/test';

test.describe('スモークテスト', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login/');

    // タイトルにアプリ名が含まれる
    await expect(page.locator('h1')).toContainText('ObatLog');

    // メールとパスワードの入力欄が存在する
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // 送信ボタンが存在する
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('プライバシーポリシーページが表示される', async ({ page }) => {
    await page.goto('/privacy/');

    // h1 が存在する
    await expect(page.locator('h1')).toBeVisible();

    // トップへ戻るリンクが存在する
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('利用規約ページが表示される', async ({ page }) => {
    await page.goto('/terms/');

    // h1 が存在する
    await expect(page.locator('h1')).toBeVisible();

    // トップへ戻るリンクが存在する
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('存在しないページで HTML が返る（静的エクスポート）', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');

    // 静的エクスポートなので 404.html またはフォールバック
    // レスポンス自体が返ることを確認（serve は 200 で返す場合がある）
    expect(response).not.toBeNull();
  });
});
