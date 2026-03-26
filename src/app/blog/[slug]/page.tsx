import BlogPostPage from '@/components/BlogPostPage';
import { getAllPostSlugs, getPostBySlug, getPostsByCategory } from '@/lib/blog';
import { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';
import { notFound } from 'next/navigation';

const site = getSiteUrl();

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: `${post.title} | ObatLog Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${site}/blog/${post.slug}/`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
    alternates: {
      canonical: `${site}/blog/${post.slug}/`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same category, excluding current post)
  const relatedPosts = getPostsByCategory(post.category)
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  // Generate JSON-LD for Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ObatLog',
      url: site,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${site}/blog/${post.slug}/`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostPage post={post} relatedPosts={relatedPosts} />
    </>
  );
}
