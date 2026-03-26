// ブログ記事一覧（カテゴリタブ付き）
'use client';

import { useState } from 'react';
import type { BlogPostMeta, BlogCategory } from '../lib/blog';

const CATEGORY_LABELS: Record<'all' | BlogCategory, string> = {
  all: 'すべて',
  guide: '使い方ガイド',
  tips: 'Tips',
};

interface BlogListPageProps {
  posts: BlogPostMeta[];
}

export default function BlogListPage({ posts }: BlogListPageProps) {
  const [filter, setFilter] = useState<'all' | BlogCategory>('all');

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <a href="/" className="text-amber-500 hover:text-amber-600 text-sm">
          ← ホームに戻る
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-6">ブログ</h1>

        {/* カテゴリタブ */}
        <div className="flex gap-2 mb-8">
          {(Object.keys(CATEGORY_LABELS) as Array<'all' | BlogCategory>).map(key => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm px-4 py-2 rounded-lg transition ${
                filter === key
                  ? 'bg-amber-400 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        {/* 記事カード一覧 */}
        <div className="space-y-4">
          {filtered.map(post => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}/`}
              className="block bg-white border rounded-xl p-5 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-base font-bold text-gray-800">{post.title}</h2>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{post.date}</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{post.description}</p>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                {CATEGORY_LABELS[post.category]}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
