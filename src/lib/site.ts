/** 正規URL（SEO・sitemap）。末尾スラッシュなし */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://obatlog.com';
  return raw.replace(/\/$/, '');
}
