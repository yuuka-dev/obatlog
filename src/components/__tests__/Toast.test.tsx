import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Toast from '../Toast';
import type { ToastItem } from '../Toast';

describe('Toast', () => {
  const baseItem: ToastItem = { id: '1', message: '削除しました' };

  it('メッセージを表示する', () => {
    render(<Toast items={[baseItem]} onDismiss={() => {}} />);
    expect(screen.getByText('削除しました')).toBeInTheDocument();
  });

  it('複数のトーストを表示する', () => {
    const items: ToastItem[] = [
      { id: '1', message: 'メッセージ1' },
      { id: '2', message: 'メッセージ2' },
    ];
    render(<Toast items={items} onDismiss={() => {}} />);
    expect(screen.getByText('メッセージ1')).toBeInTheDocument();
    expect(screen.getByText('メッセージ2')).toBeInTheDocument();
  });

  it('取り消しボタンを表示する', () => {
    const item: ToastItem = {
      id: '1',
      message: '削除しました',
      undoLabel: '取り消し',
      onUndo: vi.fn(),
    };
    render(<Toast items={[item]} onDismiss={() => {}} />);
    expect(screen.getByText('取り消し')).toBeInTheDocument();
  });

  it('取り消しボタンをクリックするとonUndoが呼ばれる', async () => {
    const onUndo = vi.fn();
    const item: ToastItem = {
      id: '1',
      message: '削除しました',
      undoLabel: '取り消し',
      onUndo,
    };
    render(<Toast items={[item]} onDismiss={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '取り消し' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('5秒後に自動消去される', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast items={[baseItem]} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledWith('1');
    vi.useRealTimers();
  });
});
