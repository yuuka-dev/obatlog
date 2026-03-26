import { getAllPosts } from '../../lib/blog';
import BlogListPage from '../../components/BlogListPage';
import type { Metadata } from 'next';
import { getSiteUrl } from '../../lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'ブログ',
  description: 'ObatLogの使い方ガイドや服薬管理のTipsを紹介します。',
  alternates: { canonical: `${site}/blog/` },
  openGraph: {
    title: 'ブログ | ObatLog',
    description: 'ObatLogの使い方ガイドや服薬管理のTipsを紹介します。',
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
