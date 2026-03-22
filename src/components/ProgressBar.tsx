// 累計プログレスバー（やさしいアンバー系カラー）
import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  unit?: string;
}

export default function ProgressBar({ current, max, unit = '' }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, (current / safeMax) * 100);
  const atLimit = current >= max;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-amber-500' : 'bg-amber-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-sm font-medium whitespace-nowrap ${atLimit ? 'text-amber-600' : 'text-gray-600'}`}>
        {current} / {max} {unit}
      </p>
    </div>
  );
}
