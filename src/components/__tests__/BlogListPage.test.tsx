import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlogListPage from '../BlogListPage';
import type { BlogPostMeta } from '../../lib/blog';

const mockPosts: BlogPostMeta[] = [
  { slug: 'post-1', title: 'ガイド記事', description: '説明1', date: '2026-03-27', category: 'guide' },
  { slug: 'post-2', title: 'Tips記事', description: '説明2', date: '2026-03-26', category: 'tips' },
  { slug: 'post-3', title: 'もう1つのガイド', description: '説明3', date: '2026-03-25', category: 'guide' },
];

describe('BlogListPage', () => {
  it('全記事を表示する', () => {
    render(<BlogListPage posts={mockPosts} />);
    expect(screen.getByText('ガイド記事')).toBeDefined();
    expect(screen.getByText('Tips記事')).toBeDefined();
    expect(screen.getByText('もう1つのガイド')).toBeDefined();
  });

  it('使い方ガイドタブでフィルタリングされる', async () => {
    render(<BlogListPage posts={mockPosts} />);
    await userEvent.click(screen.getByRole('tab', { name: '使い方ガイド' }));
    expect(screen.getByText('ガイド記事')).toBeDefined();
    expect(screen.getByText('もう1つのガイド')).toBeDefined();
    expect(screen.queryByText('Tips記事')).toBeNull();
  });

  it('Tipsタブでフィルタリングされる', async () => {
    render(<BlogListPage posts={mockPosts} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tips' }));
    expect(screen.getByText('Tips記事')).toBeDefined();
    expect(screen.queryByText('ガイド記事')).toBeNull();
  });

  it('すべてタブで全記事に戻る', async () => {
    render(<BlogListPage posts={mockPosts} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tips' }));
    await userEvent.click(screen.getByRole('tab', { name: 'すべて' }));
    expect(screen.getByText('ガイド記事')).toBeDefined();
    expect(screen.getByText('Tips記事')).toBeDefined();
  });
});
