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
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 space-y-2">
      {items.map(item => (
        <ToastEntry key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
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
