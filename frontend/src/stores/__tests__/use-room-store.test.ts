import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRoomStore } from '@/stores/use-room-store';

// Mock axios
vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('useRoomStore', () => {
  beforeEach(() => {
    useRoomStore.setState({
      room: {
        roomId: 'room-1',
        roomCode: 'ABC123',
        hostUserId: 'user-1',
        players: [
          { userId: 'user-1', nickname: '玩家1' },
          { userId: 'user-2', nickname: '玩家2' },
        ],
        status: 'playing',
        createdAt: Date.now(),
      },
      settlement: null,
      isLoading: false,
      error: null,
    });
  });

  // 6.1 测试 updatePlayersAndHost
  describe('updatePlayersAndHost', () => {
    it('正确更新 players 和 hostUserId', () => {
      const newPlayers = [
        { userId: 'user-3', nickname: '玩家3' },
        { userId: 'user-4', nickname: '玩家4' },
      ];
      useRoomStore.getState().updatePlayersAndHost(newPlayers, 'user-3');

      const state = useRoomStore.getState();
      expect(state.room?.players).toEqual(newPlayers);
      expect(state.room?.hostUserId).toBe('user-3');
    });

    it('room 为 null 时不报错', () => {
      useRoomStore.setState({ room: null });
      expect(() => {
        useRoomStore.getState().updatePlayersAndHost([], 'user-1');
      }).not.toThrow();
    });
  });

  // 6.3 测试 addPlayer
  describe('addPlayer', () => {
    it('新玩家被追加到列表', () => {
      useRoomStore.getState().addPlayer({ userId: 'user-5', nickname: '玩家5' });

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(3);
      expect(players?.[2]).toEqual({ userId: 'user-5', nickname: '玩家5' });
    });

    it('重复玩家不会被追加', () => {
      useRoomStore.getState().addPlayer({ userId: 'user-1', nickname: '玩家1' });

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(2);
    });
  });

  // 6.4 测试 removePlayer
  describe('removePlayer', () => {
    it('玩家被从列表移除', () => {
      useRoomStore.getState().removePlayer('user-2');

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(1);
      expect(players?.[0].userId).toBe('user-1');
    });

    it('移除不存在的玩家不报错', () => {
      useRoomStore.getState().removePlayer('user-999');

      const players = useRoomStore.getState().room?.players;
      expect(players).toHaveLength(2);
    });
  });
});
