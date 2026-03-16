import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRoomStore } from '@/stores/use-room-store';

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock axios
vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ code: 200 }),
    get: vi.fn(),
  },
}));

// Mock socket
vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Must import after mocks
import SettlementPage from '@/pages/settlement';

const mockSettlement = {
  roomId: 'room-1',
  players: [
    { userId: 'u1', nickname: '玩家A', chips: -50 },
    { userId: 'u2', nickname: '玩家B', chips: 100 },
    { userId: 'u3', nickname: '玩家C', chips: 0 },
    { userId: 'u4', nickname: '玩家D', chips: -50 },
  ],
  totalCheck: true,
};

describe('SettlementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoomStore.setState({
      room: null,
      settlement: null,
      isLoading: false,
      error: null,
    });
  });

  // 6.1 测试玩家排序：盈亏从高到低
  describe('玩家排序', () => {
    it('按盈亏从高到低排序', () => {
      useRoomStore.setState({ settlement: mockSettlement });
      render(<SettlementPage />);

      const playerNames = screen.getAllByText(/玩家[A-D]/).map((el) => el.textContent?.replace(/^⭐\s*/, ''));
      expect(playerNames).toEqual(['玩家B', '玩家C', '玩家A', '玩家D']);
    });
  });

  // 6.2 测试颜色映射
  describe('颜色映射', () => {
    it('正数绿色、负数红色、零灰色', () => {
      useRoomStore.setState({ settlement: mockSettlement });
      render(<SettlementPage />);

      const positiveChip = screen.getByText('+100');
      expect(positiveChip.className).toContain('text-success');

      const negativeChips = screen.getAllByText('-50');
      negativeChips.forEach((el) => {
        expect(el.className).toContain('text-danger');
      });

      const zeroChip = screen.getByText('0');
      expect(zeroChip.className).toContain('text-text-secondary');
    });
  });

  // 6.3 测试 handleClose 调用链
  describe('handleClose', () => {
    it('调用 cleanupRoom → clearSettlement → clearRoom → navigate', async () => {
      useRoomStore.setState({ settlement: mockSettlement });
      render(<SettlementPage />);

      const closeBtn = screen.getByText('关闭结算');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      const state = useRoomStore.getState();
      expect(state.settlement).toBeNull();
      expect(state.room).toBeNull();
    });
  });

  // 6.4 测试 cleanupRoom 幂等性：API 错误不阻塞关闭
  describe('cleanupRoom 幂等性', () => {
    it('API 返回错误时不阻塞关闭流程', async () => {
      const api = await import('@/lib/axios');
      (api.default.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network Error'));

      useRoomStore.setState({ settlement: mockSettlement });
      render(<SettlementPage />);

      const closeBtn = screen.getByText('关闭结算');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
      expect(useRoomStore.getState().settlement).toBeNull();
    });
  });

  // 没有结算数据时显示空状态
  describe('空状态', () => {
    it('没有结算数据时显示提示', () => {
      render(<SettlementPage />);
      expect(screen.getByText('没有结算数据')).toBeTruthy();
    });
  });

  // 总账校验展示
  describe('总账校验', () => {
    it('通过时显示 ✅', () => {
      useRoomStore.setState({ settlement: { ...mockSettlement, totalCheck: true } });
      render(<SettlementPage />);
      expect(screen.getByText(/通过/)).toBeTruthy();
    });

    it('未通过时显示 ❌', () => {
      useRoomStore.setState({ settlement: { ...mockSettlement, totalCheck: false } });
      render(<SettlementPage />);
      expect(screen.getByText(/未通过/)).toBeTruthy();
    });
  });
});
