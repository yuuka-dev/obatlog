/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry } from 'serwist';
import { ExpirationPlugin, NetworkFirst, Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // ページ遷移（ドキュメント）時は古いHTML/JSのズレで落ちるのを防ぐため、
    // navigation は NetworkFirst 寄りにする（更新があれば都度取りに行く）
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'navigation-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 60,
          }),
        ],
      }),
    },
    ...defaultCache,
    {
      matcher: /\/v1\//,
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 300,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
