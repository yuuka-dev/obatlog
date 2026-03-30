import { getAllPosts } from '../../lib/blog';
import BlogListPage from '../../components/BlogListPage';
import type { Metadata } from 'next';
import { getSiteUrl } from '../../lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: '服薬管理ブログ',
  description:
    'ObatLogの使い方ガイドや服薬管理のコツ、飲み忘れ防止のヒントをわかりやすく紹介。お薬との上手な付き合い方を学べるブログです。',
  alternates: { canonical: `${site}/blog/` },
  openGraph: {
    title: '服薬管理ブログ | ObatLog',
    description:
      'ObatLogの使い方ガイドや服薬管理のコツ、飲み忘れ防止のヒントをわかりやすく紹介。お薬との上手な付き合い方を学べるブログです。',
    url: `${site}/blog/`,
    siteName: 'ObatLog',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return <BlogListPage posts={posts} />;
}
