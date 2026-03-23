// メール通知のHTMLテンプレート

/** 単一の薬のリマインダーメール */
function singleMedHtml(medName: string): string {
  return `<html lang="ja"><head><meta charset="utf-8"></head><body>
<div style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:24px;">
  <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px;">ObatLog リマインダー</h2>
  <p style="color:#374151;font-size:16px;margin:0 0 8px;">${medName} の時間だよ</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="color:#9ca3af;font-size:12px;margin:0;">このメールは ObatLog の通知設定に基づいて送信されています。</p>
</div>
</body></html>`;
}

/** 複数の薬のリマインダーメール */
function multiMedHtml(medNames: string[]): string {
  const items = medNames.map(n => `    <li>${n} の時間だよ</li>`).join('\n');
  return `<html lang="ja"><head><meta charset="utf-8"></head><body>
<div style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:24px;">
  <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px;">ObatLog リマインダー</h2>
  <ul style="color:#374151;font-size:16px;margin:0 0 8px;padding-left:20px;">
${items}
  </ul>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
  <p style="color:#9ca3af;font-size:12px;margin:0;">このメールは ObatLog の通知設定に基づいて送信されています。</p>
</div>
</body></html>`;
}

/** リマインダーメールのHTMLを生成 */
export function buildReminderHtml(medNames: string[]): string {
  if (medNames.length === 1) return singleMedHtml(medNames[0]);
  return multiMedHtml(medNames);
}
