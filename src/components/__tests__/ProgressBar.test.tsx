import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('現在値と最大値を表示する', () => {
    render(<ProgressBar current={3} max={10} />);
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('単位を表示する', () => {
    render(<ProgressBar current={5} max={20} unit="錠" />);
    expect(screen.getByText('5 / 20 錠')).toBeInTheDocument();
  });

  it('上限到達時にスタイルが変わる', () => {
    const { container } = render(<ProgressBar current={10} max={10} />);
    const bar = container.querySelector('[style]');
    expect(bar).toHaveClass('bg-amber-500');
  });

  it('max=0 でもゼロ除算しない', () => {
    render(<ProgressBar current={0} max={0} />);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
