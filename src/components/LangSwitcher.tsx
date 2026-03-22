'use client';
import { setLang, type Lang } from '../i18n/index';

const langs: { code: Lang; label: string }[] = [
  { code: 'ja', label: 'JA' },
  { code: 'en', label: 'EN' },
  { code: 'id', label: 'ID' },
];

interface LangSwitcherProps {
  current: Lang;
  className?: string;
}

/** 法的ページ・LP用。localStorage 更新後に再描画するためリロードする */
export default function LangSwitcher({ current, className = '' }: LangSwitcherProps) {
  return (
    <div className={`flex gap-1 justify-center ${className}`}>
      {langs.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => {
            setLang(code);
            window.location.reload();
          }}
          className={`text-xs px-3 py-1.5 rounded-lg transition
            ${current === code ? 'bg-amber-400 text-white' : 'text-gray-400 hover:text-gray-600 bg-gray-100'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
