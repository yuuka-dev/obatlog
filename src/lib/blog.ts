import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';

const contentDirectory = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  category: 'guide' | 'tips';
  description: string;
  publishedAt: string;
  author: string;
  content: string;
}

export interface BlogPostMetadata {
  slug: string;
  title: string;
  category: 'guide' | 'tips';
  description: string;
  publishedAt: string;
  author: string;
}

/**
 * Validate frontmatter fields - throws error if invalid
 */
function validateFrontmatter(slug: string, data: any): void {
  const required = ['title', 'category', 'description', 'publishedAt', 'author'];
  const missing = required.filter(field => !data[field]);

  if (missing.length > 0) {
    throw new Error(
      `Invalid frontmatter in ${slug}.md: missing required fields: ${missing.join(', ')}`
    );
  }

  if (!['guide', 'tips'].includes(data.category)) {
    throw new Error(
      `Invalid frontmatter in ${slug}.md: category must be 'guide' or 'tips', got '${data.category}'`
    );
  }

  // Convert Date object to string if needed
  const dateStr = data.publishedAt instanceof Date
    ? data.publishedAt.toISOString().split('T')[0]
    : String(data.publishedAt);

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(
      `Invalid frontmatter in ${slug}.md: publishedAt must be in YYYY-MM-DD format, got '${dateStr}'`
    );
  }

  // Update the data object with string date
  data.publishedAt = dateStr;
}

/**
 * Get all blog post slugs
 */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const files = fs.readdirSync(contentDirectory);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''));
}

/**
 * Get metadata for all blog posts (without content)
 */
export function getAllPostsMetadata(): BlogPostMetadata[] {
  const slugs = getAllPostSlugs();

  const posts = slugs.map(slug => {
    const fullPath = path.join(contentDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    validateFrontmatter(slug, data);

    return {
      slug,
      title: data.title,
      category: data.category,
      description: data.description,
      publishedAt: data.publishedAt,
      author: data.author,
    };
  });

  // Sort by publishedAt descending (newest first)
  return posts.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/**
 * Get a single blog post by slug (with content)
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(contentDirectory, `${slug}.md`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    validateFrontmatter(slug, data);

    // Convert markdown to HTML
    const processedContent = await remark()
      .use(remarkGfm)
      .use(html, { sanitize: false })
      .process(content);

    const contentHtml = processedContent.toString();

    return {
      slug,
      title: data.title,
      category: data.category,
      description: data.description,
      publishedAt: data.publishedAt,
      author: data.author,
      content: contentHtml,
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    throw error;
  }
}

/**
 * Get posts by category
 */
export function getPostsByCategory(category: 'guide' | 'tips'): BlogPostMetadata[] {
  const allPosts = getAllPostsMetadata();
  return allPosts.filter(post => post.category === category);
}
