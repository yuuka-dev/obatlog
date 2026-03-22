/** 正規URL（SEO・sitemap）。末尾スラッシュなし */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://obatlog.osaka29.jp';
  return raw.replace(/\/$/, '');
}
