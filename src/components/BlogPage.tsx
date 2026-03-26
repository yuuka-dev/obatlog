'use client';
import React, { useState } from 'react';
import { t, getLang } from '@/i18n/index';
import type { BlogPostMetadata } from '@/lib/blog';

interface BlogPageProps {
  posts: BlogPostMetadata[];
}

export default function BlogPage({ posts }: BlogPageProps) {
  const lang = getLang();
  const [activeCategory, setActiveCategory] = useState<'guide' | 'tips' | 'all'>('all');

  const filteredPosts =
    activeCategory === 'all'
      ? posts
      : posts.filter((post) => post.category === activeCategory);

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
      <header className="px-6 pt-16 pb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {t('blog.title' as any, lang)}
        </h1>
        <p className="text-gray-500">
          {t('blog.subtitle' as any, lang)}
        </p>
      </header>

      {/* Category Tabs */}
      <div className="px-6 max-w-2xl mx-auto mb-8">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 font-medium transition ${
              activeCategory === 'all'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {lang === 'ja' ? 'すべて' : lang === 'id' ? 'Semua' : 'All'}
          </button>
          <button
            onClick={() => setActiveCategory('guide')}
            className={`px-4 py-2 font-medium transition ${
              activeCategory === 'guide'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('blog.categoryGuide' as any, lang)}
          </button>
          <button
            onClick={() => setActiveCategory('tips')}
            className={`px-4 py-2 font-medium transition ${
              activeCategory === 'tips'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('blog.categoryTips' as any, lang)}
          </button>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="px-6 pb-16 max-w-2xl mx-auto">
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}/`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100"
            >
              <div className="flex items-start gap-3 mb-3">
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
                <span className="text-xs text-gray-400">
                  {formatDate(post.publishedAt)}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {post.title}
              </h2>
              <p className="text-gray-600 text-sm mb-3">{post.description}</p>
              <span className="text-amber-600 text-sm font-medium hover:underline">
                {t('blog.readMore' as any, lang)} →
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs text-gray-400 border-t border-gray-100">
        <div className="flex justify-center gap-4 mb-2">
          <a href="/" className="hover:text-gray-600 transition">
            {t('nav.home' as any, lang)}
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
