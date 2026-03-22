// +/- ステッパー入力コンポーネント
import React from 'react';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export default function Stepper({ value, onChange, min = 1, max, unit }: StepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-600 disabled:opacity-30">
        -
      </button>
      <span className="w-10 text-center text-base font-semibold">{value}</span>
      <button type="button"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
        disabled={max !== undefined && value >= max}
        className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-600 disabled:opacity-30">
        +
      </button>
      {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
    </div>
  );
}
