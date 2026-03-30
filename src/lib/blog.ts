// ブログ記事の読み取り・HTML変換ユーティリティ
// ビルド時にサーバーコンポーネントから呼ばれる
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export type BlogCategory = 'tips' | 'guide';

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: BlogCategory;
  order: number;
}

export interface BlogPost extends BlogPostMeta {
  contentHtml: string;
}

const REQUIRED_FIELDS = ['title', 'description', 'date', 'category', 'order'] as const;
const VALID_CATEGORIES: BlogCategory[] = ['tips', 'guide'];

// frontmatterバリデーション（不備時はビルドエラー）
function validateFrontmatter(data: Record<string, unknown>, filePath: string): void {
  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      throw new Error(`frontmatter に "${field}" がありません: ${filePath}`);
    }
  }
  if (!VALID_CATEGORIES.includes(data.category as BlogCategory)) {
    throw new Error(`category は "tips" または "guide" のみ: ${filePath}`);
  }
  if (isNaN(Date.parse(data.date as string))) {
    throw new Error(`date の形式が不正です（YYYY-MM-DD）: ${filePath}`);
  }
  if (typeof data.order !== 'number' || !Number.isInteger(data.order) || data.order < 1) {
    throw new Error(`order は正の整数が必要です: ${filePath}`);
  }
}

// 全記事のメタデータを日付降順で取得
export function getAllPosts(): BlogPostMeta[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const filePath = path.join(BLOG_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    validateFrontmatter(data, filePath);
    return {
      slug: file.replace(/\.md$/, ''),
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      category: data.category as BlogCategory,
      order: data.order as number,
    };
  });
  // 仕様: date DESC → order ASC の複合ソート
  return posts.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.order - b.order;
  });
}

// 全slugの配列（generateStaticParams 用）
export function getAllSlugs(): string[] {
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

// 個別記事のメタデータ + HTML本文を取得
export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  validateFrontmatter(data, filePath);

  const result = await remark().use(html).process(content);

  return {
    slug,
    title: data.title as string,
    description: data.description as string,
    date: data.date as string,
    category: data.category as BlogCategory,
    order: data.order as number,
    contentHtml: result.toString(),
  };
}
