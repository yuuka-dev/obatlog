import BlogPage from '@/components/BlogPage';
import { getAllPostsMetadata } from '@/lib/blog';
import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'ブログ | ObatLog',
  description: 'ObatLogの使い方ガイドやTipsをご紹介。服薬管理をもっと便利に。',
  openGraph: {
    title: 'ブログ | ObatLog',
    description: 'ObatLogの使い方ガイドやTipsをご紹介。服薬管理をもっと便利に。',
    url: `${site}/blog/`,
    type: 'website',
  },
  alternates: {
    canonical: `${site}/blog/`,
  },
};

export default function Page() {
  const posts = getAllPostsMetadata();

  return <BlogPage posts={posts} />;
}
