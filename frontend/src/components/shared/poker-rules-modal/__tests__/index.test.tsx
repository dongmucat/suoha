import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PokerRulesModal from '@/components/shared/poker-rules-modal';

describe('PokerRulesModal', () => {
  it('renders modal content when open=true', () => {
    render(<PokerRulesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('德州扑克规则')).toBeTruthy();
    expect(screen.getByText(/皇家同花顺/)).toBeTruthy();
    expect(screen.getByText(/翻牌前/)).toBeTruthy();
  });

  it('does not render when open=false', () => {
    const { container } = render(<PokerRulesModal open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<PokerRulesModal open={true} onClose={onClose} />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<PokerRulesModal open={true} onClose={onClose} />);
    const backdrop = screen.getByText('德州扑克规则').closest('.fixed');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<PokerRulesModal open={true} onClose={onClose} />);
    const title = screen.getByText('德州扑克规则');
    fireEvent.click(title);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('contains both hand rankings and game flow sections', () => {
    render(<PokerRulesModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('牌型大小（从大到小）')).toBeTruthy();
    expect(screen.getByText(/高牌/)).toBeTruthy();
    expect(screen.getByText(/四条/)).toBeTruthy();
    expect(screen.getByText('游戏流程')).toBeTruthy();
    expect(screen.getByText(/河牌/)).toBeTruthy();
    expect(screen.getByText(/摊牌/)).toBeTruthy();
  });
});
