'use client';
import React from 'react';
import { t, getLang } from '@/i18n/index';
import type { BlogPost, BlogPostMetadata } from '@/lib/blog';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPostMetadata[];
}

export default function BlogPostPage({ post, relatedPosts }: BlogPostPageProps) {
  const lang = getLang();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 max-w-2xl mx-auto">
        <a
          href="/blog/"
          className="text-sm text-amber-600 hover:text-amber-700 transition"
        >
          {t('blog.backToList' as any, lang)}
        </a>
      </header>

      {/* Article */}
      <article className="px-6 pb-12 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-xs px-2 py-1 rounded ${
                post.category === 'guide'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {post.category === 'guide'
                ? t('blog.categoryGuide' as any, lang)
                : t('blog.categoryTips' as any, lang)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>

          {/* Date & Author */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <span>
              {t('blog.publishedAt' as any, lang)}: {formatDate(post.publishedAt)}
            </span>
            <span>
              {t('blog.author' as any, lang)}: {post.author}
            </span>
          </div>

          {/* Content */}
          <div
            className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-amber-600 hover:prose-a:text-amber-700 prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="px-6 pb-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t('blog.relatedPosts' as any, lang)}
          </h2>
          <div className="space-y-4">
            {relatedPosts.map((relatedPost) => (
              <a
                key={relatedPost.slug}
                href={`/blog/${relatedPost.slug}/`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 border border-gray-100"
              >
                <h3 className="font-bold text-gray-800 mb-1">
                  {relatedPost.title}
                </h3>
                <p className="text-sm text-gray-600">{relatedPost.description}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs text-gray-400 border-t border-gray-100">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/" className="hover:text-gray-600 transition">
            {t('nav.home' as any, lang)}
          </a>
          <a href="/blog/" className="hover:text-gray-600 transition">
            {t('nav.blog' as any, lang)}
          </a>
          <a href="/privacy/" className="hover:text-gray-600 transition">
            {t('privacy' as any, lang)}
          </a>
          <a href="/terms/" className="hover:text-gray-600 transition">
            {t('terms' as any, lang)}
          </a>
        </div>
        <p>© 2026 ObatLog</p>
      </footer>
    </div>
  );
}
