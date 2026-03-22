// Astro middleware（静的出力のためサーバーサイドでは動作しない）
// 未認証チェックは各コンポーネント内の onAuthStateChanged で実施する
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  return next();
});
