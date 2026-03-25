import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Stepper from '../Stepper';

describe('Stepper', () => {
  it('現在値を表示する', () => {
    render(<Stepper value={3} onChange={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('+ボタンで値が増える', async () => {
    const onChange = vi.fn();
    render(<Stepper value={3} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    // 2番目のボタンが「+」
    await userEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('-ボタンで値が減る', async () => {
    const onChange = vi.fn();
    render(<Stepper value={3} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    // 1番目のボタンが「-」
    await userEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('min以下にならない', () => {
    render(<Stepper value={1} onChange={() => {}} min={1} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });

  it('max以上にならない', () => {
    render(<Stepper value={5} onChange={() => {}} max={5} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled();
  });

  it('単位を表示する', () => {
    render(<Stepper value={2} onChange={() => {}} unit="錠" />);
    expect(screen.getByText('錠')).toBeInTheDocument();
  });
});
