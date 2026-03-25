import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// エラーを投げる子コンポーネント
function ThrowError(): JSX.Element {
  throw new Error('テストエラー');
}

describe('ErrorBoundary', () => {
  it('正常時は子要素を表示する', () => {
    render(
      <ErrorBoundary>
        <p>正常コンテンツ</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('正常コンテンツ')).toBeInTheDocument();
  });

  it('子コンポーネントのエラーをキャッチしてフォールバックを表示する', () => {
    // React がコンソールにエラーを出力するのを抑制
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText('エラーが発生しました。ページを再読み込みしてください。'),
    ).toBeInTheDocument();
    expect(screen.getByText('再読み込み')).toBeInTheDocument();

    spy.mockRestore();
  });
});
