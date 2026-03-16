import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChipStore } from '@/stores/use-chip-store';
import { useRoomStore } from '@/stores/use-room-store';

// Mock socket.io
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(() => mockSocket),
  disconnectSocket: vi.fn(),
}));

describe('useChipStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockReset();
    useChipStore.getState().reset();
    useRoomStore.setState({
      room: {
        roomId: 'room-1',
        roomCode: 'ABC123',
        hostUserId: 'user-1',
        players: [{ userId: 'user-1', nickname: '玩家1' }],
        status: 'playing',
        createdAt: Date.now(),
      },
      settlement: null,
      isLoading: false,
      error: null,
    });
  });

  function getEventHandler(eventName: string) {
    const call = mockSocket.on.mock.calls.find((args) => args[0] === eventName);
    return call ? call[1] : undefined;
  }

  function connectStore() {
    useChipStore.getState().connect('test-token', 'room-1');
  }

  // 6.2 测试 room-state 事件处理
  describe('room-state 事件', () => {
    it('同步 chips/pot/bets/players/hostUserId', () => {
      connectStore();
      const handler = getEventHandler('room-state');
      expect(handler).toBeDefined();

      handler({
        chips: { 'user-1': 100, 'user-2': 200 },
        pot: 50,
        bets: { 'user-1': 10 },
        players: [
          { userId: 'user-1', nickname: '玩家1' },
          { userId: 'user-2', nickname: '玩家2' },
        ],
        hostUserId: 'user-2',
      });

      const chipState = useChipStore.getState();
      expect(chipState.chips).toEqual({ 'user-1': 100, 'user-2': 200 });
      expect(chipState.pot).toBe(50);
      expect(chipState.bets).toEqual({ 'user-1': 10 });

      const roomState = useRoomStore.getState();
      expect(roomState.room?.players).toHaveLength(2);
      expect(roomState.room?.hostUserId).toBe('user-2');
    });

    it('不含 players 时不更新 roomStore', () => {
      connectStore();
      const handler = getEventHandler('room-state');

      handler({
        chips: { 'user-1': 100 },
        pot: 0,
        bets: {},
      });

      const roomState = useRoomStore.getState();
      expect(roomState.room?.hostUserId).toBe('user-1');
    });
  });

  // 6.3 测试 player-joined 事件
  describe('player-joined 事件', () => {
    it('新玩家被追加到列表', () => {
      connectStore();
      const handler = getEventHandler('player-joined');
      expect(handler).toBeDefined();

      handler({ userId: 'user-3', nickname: '玩家3' });

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(2);
      expect(players?.[1]).toEqual({ userId: 'user-3', nickname: '玩家3' });
    });
  });

  // 6.4 测试 player-left 事件
  describe('player-left 事件', () => {
    it('玩家被从列表移除', () => {
      useRoomStore.setState({
        room: {
          ...useRoomStore.getState().room!,
          players: [
            { userId: 'user-1', nickname: '玩家1' },
            { userId: 'user-2', nickname: '玩家2' },
          ],
        },
      });

      connectStore();
      const handler = getEventHandler('player-left');
      expect(handler).toBeDefined();

      handler({ userId: 'user-2' });

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(1);
      expect(players?.[0].userId).toBe('user-1');
    });
  });

  // 6.5 测试 manualReconnect
  describe('manualReconnect', () => {
    it('断开并重新连接', async () => {
      const { connectSocket } = await import('@/lib/socket') as any;
      connectStore();

      expect(useChipStore.getState()._token).toBe('test-token');
      expect(useChipStore.getState()._roomId).toBe('room-1');

      useChipStore.getState().manualReconnect();

      // connectSocket should be called again (once for initial, once for reconnect)
      expect(connectSocket).toHaveBeenCalledTimes(2);
    });

    it('无 token/roomId 时不执行', async () => {
      const { connectSocket } = await import('@/lib/socket') as any;
      connectSocket.mockClear();
      useChipStore.getState().manualReconnect();
      expect(connectSocket).not.toHaveBeenCalled();
    });
  });

  // 6.6 测试 reconnectAttempts 计数
  describe('reconnectAttempts', () => {
    it('reconnect_attempt 时递增', () => {
      connectStore();
      const handler = getEventHandler('reconnect_attempt');

      handler();
      expect(useChipStore.getState().reconnectAttempts).toBe(1);

      handler();
      expect(useChipStore.getState().reconnectAttempts).toBe(2);
    });

    it('connect 时重置', () => {
      connectStore();
      const attemptHandler = getEventHandler('reconnect_attempt');
      const connectHandler = getEventHandler('connect');

      attemptHandler();
      attemptHandler();
      expect(useChipStore.getState().reconnectAttempts).toBe(2);

      connectHandler();
      expect(useChipStore.getState().reconnectAttempts).toBe(0);
    });

    it('reconnect_failed 时重置', () => {
      connectStore();
      const attemptHandler = getEventHandler('reconnect_attempt');
      const failedHandler = getEventHandler('reconnect_failed');

      attemptHandler();
      expect(useChipStore.getState().reconnectAttempts).toBe(1);

      failedHandler();
      expect(useChipStore.getState().reconnectAttempts).toBe(0);
    });

    it('reconnect 时重置并设置 justReconnected', () => {
      connectStore();
      const attemptHandler = getEventHandler('reconnect_attempt');
      const reconnectHandler = getEventHandler('reconnect');

      attemptHandler();
      reconnectHandler();

      const state = useChipStore.getState();
      expect(state.reconnectAttempts).toBe(0);
      expect(state.justReconnected).toBe(true);
      expect(state.connected).toBe(true);
    });
  });

  // 10.1 测试 owner-transferred 事件
  describe('owner-transferred 事件', () => {
    it('更新 roomStore 的 hostUserId', () => {
      useRoomStore.setState({
        room: {
          ...useRoomStore.getState().room!,
          players: [
            { userId: 'user-1', nickname: '玩家1' },
            { userId: 'user-2', nickname: '玩家2' },
          ],
          hostUserId: 'user-1',
        },
      });

      connectStore();
      const handler = getEventHandler('owner-transferred');
      expect(handler).toBeDefined();

      handler({ newHostUserId: 'user-2', newHostNickname: '玩家2' });

      const roomState = useRoomStore.getState();
      expect(roomState.room?.hostUserId).toBe('user-2');
      expect(roomState.room?.players).toHaveLength(2);
    });

    it('room 为 null 时不报错', () => {
      useRoomStore.setState({ room: null });
      connectStore();
      const handler = getEventHandler('owner-transferred');

      expect(() => handler({ newHostUserId: 'user-2', newHostNickname: '玩家2' })).not.toThrow();
    });
  });

  // 10.2 测试 game-ended 事件
  describe('game-ended 事件', () => {
    it('存储 settlement 数据并设置 gameEnded 标志', () => {
      connectStore();
      const handler = getEventHandler('game-ended');
      expect(handler).toBeDefined();

      const settlementData = {
        roomId: 'room-1',
        players: [
          { userId: 'user-1', nickname: '玩家1', chips: 50 },
          { userId: 'user-2', nickname: '玩家2', chips: -50 },
        ],
        totalCheck: true,
      };

      handler(settlementData);

      const chipState = useChipStore.getState();
      expect(chipState.gameEnded).toBe(true);

      const roomState = useRoomStore.getState();
      expect(roomState.settlement).toEqual(settlementData);
      expect(roomState.settlement?.totalCheck).toBe(true);
    });
  });

  // 10.3 测试前端池底非零检查（通过 endGame 方法）
  describe('transferOwner 方法', () => {
    it('socket 未连接时返回失败', async () => {
      const res = await useChipStore.getState().transferOwner('user-2');
      expect(res.success).toBe(false);
      expect(res.error).toBe('未连接');
    });

    it('通过 socket 发送 transfer-owner 事件', () => {
      connectStore();
      useChipStore.getState().transferOwner('user-2');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'transfer-owner',
        { newHostUserId: 'user-2' },
        expect.any(Function),
      );
    });
  });

  describe('endGame 方法', () => {
    it('socket 未连接时返回失败', async () => {
      const res = await useChipStore.getState().endGame();
      expect(res.success).toBe(false);
      expect(res.error).toBe('未连接');
    });

    it('通过 socket 发送 end-game 事件', () => {
      connectStore();
      useChipStore.getState().endGame();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'end-game',
        {},
        expect.any(Function),
      );
    });
  });

  // reset 包含 gameEnded
  describe('reset', () => {
    it('重置所有状态包括 gameEnded', () => {
      connectStore();
      useChipStore.setState({ gameEnded: true, pot: 100 });

      useChipStore.getState().reset();

      const state = useChipStore.getState();
      expect(state.gameEnded).toBe(false);
      expect(state.pot).toBe(0);
    });
  });
});
