// Toast通知コンポーネント（取り消しボタン付き）
import React, { useEffect } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
}

interface ToastProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function Toast({ items, onDismiss }: ToastProps) {
  // z-[100]: TabNav/下部UI が z-50 より上に来て取り消しが押せないのを防ぐ
  // bottom: 広告(50px)+タブ+安全余白より上に固定（md は従来どおり右下）
  return (
    <div
      className="fixed left-4 right-4 space-y-2 z-[100] pointer-events-none
        bottom-[calc(10rem+env(safe-area-inset-bottom,0px))]
        md:pointer-events-auto md:bottom-4 md:left-auto md:right-4 md:w-80 md:max-w-none"
    >
      {items.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <ToastEntry item={item} onDismiss={() => onDismiss(item.id)} />
        </div>
      ))}
    </div>
  );
}

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gray-800 text-white rounded-xl p-4 flex justify-between items-center shadow-lg">
      <span className="text-sm">{item.message}</span>
      {item.undoLabel && item.onUndo && (
        <button onClick={item.onUndo} className="text-amber-400 font-medium text-sm ml-3 shrink-0">
          {item.undoLabel}
        </button>
      )}
    </div>
  );
}
