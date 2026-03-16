import { create } from 'zustand';
import api from '@/lib/axios';

interface PlayerInfo {
  userId: string;
  nickname: string;
}

interface PlayerSettlement {
  userId: string;
  nickname: string;
  chips: number;
}

interface SettlementData {
  roomId: string;
  players: PlayerSettlement[];
  totalCheck: boolean;
}

interface RoomInfo {
  roomId: string;
  roomCode: string;
  hostUserId: string;
  players: PlayerInfo[];
  status: string;
  createdAt: number;
}

interface RoomState {
  room: RoomInfo | null;
  settlement: SettlementData | null;
  isLoading: boolean;
  error: string | null;
  createRoom: () => Promise<{ roomId: string; roomCode: string }>;
  joinRoom: (roomCode: string) => Promise<{ roomId: string; roomCode: string }>;
  fetchRoomInfo: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  cleanupRoom: (roomId: string) => Promise<void>;
  updatePlayersAndHost: (players: PlayerInfo[], hostUserId: string) => void;
  addPlayer: (player: PlayerInfo) => void;
  removePlayer: (userId: string) => void;
  clearRoom: () => void;
  clearSettlement: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  settlement: null,
  isLoading: false,
  error: null,

  createRoom: async () => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.post('/rooms');
      const { roomId, roomCode } = res.data;
      return { roomId, roomCode };
    } catch (e: any) {
      const msg = e.message || '创建房间失败';
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  joinRoom: async (roomCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.post('/rooms/join', { roomCode });
      const { roomId, roomCode: code } = res.data;
      return { roomId, roomCode: code };
    } catch (e: any) {
      const msg = e.message || '加入房间失败';
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRoomInfo: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.get(`/rooms/${roomId}`);
      set({ room: res.data });
    } catch (e: any) {
      const msg = e.message || '获取房间信息失败';
      set({ error: msg });
    } finally {
      set({ isLoading: false });
    }
  },

  clearRoom: () => {
    set({ room: null, error: null });
  },

  clearSettlement: () => {
    set({ settlement: null });
  },

  updatePlayersAndHost: (players: PlayerInfo[], hostUserId: string) => {
    const room = get().room;
    if (room) {
      set({ room: { ...room, players, hostUserId } });
    }
  },

  addPlayer: (player: PlayerInfo) => {
    const room = get().room;
    if (room && !room.players.some((p) => p.userId === player.userId)) {
      set({ room: { ...room, players: [...room.players, player] } });
    }
  },

  removePlayer: (userId: string) => {
    const room = get().room;
    if (room) {
      set({ room: { ...room, players: room.players.filter((p) => p.userId !== userId) } });
    }
  },

  leaveRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/rooms/${roomId}/leave`);
      set({ room: null });
    } catch (e: any) {
      const msg = e.message || '退出房间失败';
      set({ error: msg });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  cleanupRoom: async (roomId: string) => {
    try {
      await api.post(`/rooms/${roomId}/cleanup`);
    } catch {
      // 幂等：忽略错误，可能已被其他玩家清理
    }
  },
}));
