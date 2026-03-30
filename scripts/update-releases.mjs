/**
 * releases.json 自動更新スクリプト
 *
 * CI の version-bump ステップで呼び出される。
 * 引数でコミットメッセージファイルのパスを受け取る。
 * ja はコミットメッセージから生成し、en / id は Google Translate で自動翻訳。
 *
 * 使い方: node scripts/update-releases.mjs <commits-file>
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const RELEASES_PATH = 'src/i18n/releases.json';

// Google Translate 無料エンドポイント（API キー不要）
async function translate(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0].map((s) => s[0]).join('');
  } catch {
    return text;
  }
}

async function main() {
  const commitsFile = process.argv[2];
  if (!commitsFile || !existsSync(commitsFile)) {
    console.log('コミットファイルが見つからないためスキップ');
    process.exit(0);
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = pkg.version;

  const commitsRaw = readFileSync(commitsFile, 'utf-8');
  if (!commitsRaw.trim()) {
    console.log('コミットが空のためスキップ');
    process.exit(0);
  }

  // feat / fix / update のみ抽出し、プレフィックスを除去
  const jaLines = commitsRaw
    .split('\n')
    .filter((l) => /^(feat|fix|update)(\(|:)/.test(l))
    .map((l) => l.replace(/^(feat|fix|update)(\([^)]*\))?:\s*/, ''));

  if (jaLines.length === 0) {
    console.log('ユーザー向け変更なし、スキップ');
    process.exit(0);
  }

  // 翻訳（並列実行）
  const [enLines, idLines] = await Promise.all([
    Promise.all(jaLines.map((t) => translate(t, 'en'))),
    Promise.all(jaLines.map((t) => translate(t, 'id'))),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const entry = {
    date: today,
    changes: { ja: jaLines, en: enLines, id: idLines },
  };

  // 新バージョンを先頭に挿入
  const releases = JSON.parse(readFileSync(RELEASES_PATH, 'utf-8'));
  const updated = { [version]: entry, ...releases };
  writeFileSync(RELEASES_PATH, JSON.stringify(updated, null, 2) + '\n');

  console.log(`releases.json に v${version} を追加`);
  console.log('ja:', jaLines);
  console.log('en:', enLines);
  console.log('id:', idLines);
}

main();
