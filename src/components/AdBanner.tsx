'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdBanner() {
  const pushed = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

  useEffect(() => {
    if (!clientId || !slotId || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense 読み込み失敗は無視
    }
  }, [clientId, slotId]);

  // 環境変数未設定時
  if (!clientId || !slotId) {
    // localhost ではプレースホルダー表示
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return (
        <div className="bg-gray-200 text-gray-400 text-xs flex items-center justify-center" style={{ height: 50 }}>
          広告プレースホルダー
        </div>
      );
    }
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'inline-block', width: 320, height: 50 }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      // 申請用HTMLに合わせて 320x50 固定
      // data-ad-format を明示しない場合も動くが、意図を揃えるため固定を指定
      data-ad-format="fixed"
    />
  );
}
