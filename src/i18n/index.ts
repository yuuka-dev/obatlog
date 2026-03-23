// t(key, lang): 指定言語の翻訳文字列を返す
// ライブラリ不要のシンプルな実装
import ja from './ja.json';
import en from './en.json';
import id from './id.json';

export type Lang = 'ja' | 'en' | 'id';
type TranslationKey = keyof typeof ja;

const translations: Record<Lang, Record<string, string>> = { ja, en, id };

export function t(key: TranslationKey, lang: Lang = 'ja'): string {
  return translations[lang][key] ?? translations['ja'][key] ?? key;
}

// localStorageから言語設定を取得（クライアントサイドのみ）
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ja';
  try {
    return (localStorage.getItem('lang') as Lang) ?? 'ja';
  } catch {
    // 端末/ブラウザ設定で localStorage がブロックされてる場合がある
    return 'ja';
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem('lang', lang);
  } catch {
    // ignore
  }
}
