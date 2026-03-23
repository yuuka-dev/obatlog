'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerUpdateWatcher() {
  const [needsReload, setNeedsReload] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let isCancelled = false;

    navigator.serviceWorker.ready
      .then((registration) => {
        // いったん問い合わせ（新しいSWがあれば updatefound が来る）
        registration.update().catch(() => {});

        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (isCancelled) return;
            if (installing.state === 'installed') {
              // waiting の状態で入ってきたら、古いページ/チャンクとズレてる可能性があるのでリロード
              // （Serwist側の skipWaiting + clientsClaim でも、ロード済みのリソースはズレることがある）
              setNeedsReload(true);
              window.location.reload();
            }
          };
        };
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!needsReload) return null;
  return null;
}

