import { getAllSlugs, getPostBySlug } from '../../../lib/blog';
import { getSiteUrl } from '../../../lib/site';
import type { Metadata } from 'next';

const site = getSiteUrl();

// 未定義slugへのアクセスを404にする（静的エクスポートのため）
export const dynamicParams = false;

// 全記事のslugを静的生成
export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

// frontmatterからメタデータ自動生成
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${site}/blog/${slug}/` },
    openGraph: {
      title: `${post.title} | ObatLog`,
      description: post.description,
      url: `${site}/blog/${slug}/`,
      siteName: 'ObatLog',
      locale: 'ja_JP',
      type: 'article',
      publishedTime: post.date,
    },
    robots: { index: true, follow: true },
  };
}

// セキュリティ注: contentHtml はリポジトリ内のMarkdownから生成した信頼済みコンテンツのみ
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // Article JSON-LD 構造化データ
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: 'ObatLog',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ObatLog',
    },
    url: `${site}/blog/${slug}/`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <a href="/blog/" className="text-amber-500 hover:text-amber-600 text-sm">
          ← ブログに戻る
        </a>
        <article className="mt-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{post.title}</h1>
          <p className="text-sm text-gray-400 mb-8">{post.date}</p>
          <div
            className="prose prose-gray prose-headings:text-gray-800 prose-a:text-amber-600 max-w-none"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </div>
  );
}
