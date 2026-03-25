// mailTemplate のユニットテスト
import { buildReminderHtml } from '../mailTemplate';

describe('buildReminderHtml', () => {
  it('単一の薬名で単一テンプレートを返す', () => {
    const html = buildReminderHtml(['テスト薬A']);
    expect(html).toContain('テスト薬A の時間だよ');
    expect(html).toContain('ObatLog リマインダー');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<li>');
  });

  it('複数の薬名でリスト形式テンプレートを返す', () => {
    const html = buildReminderHtml(['薬A', '薬B', '薬C']);
    expect(html).toContain('薬A の時間だよ');
    expect(html).toContain('薬B の時間だよ');
    expect(html).toContain('薬C の時間だよ');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>');
  });

  it('HTML特殊文字がエスケープされる', () => {
    const html = buildReminderHtml(['<script>alert("xss")</script>']);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;');
  });

  it('全特殊文字（& " \' < >）がエスケープされる', () => {
    const html = buildReminderHtml(['A&B', "C'D"]);
    expect(html).toContain('A&amp;B');
    expect(html).toContain('C&#39;D');
  });
});
