import { create } from 'zustand';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useRoomStore } from '@/stores/use-room-store';
import type { Socket } from 'socket.io-client';

interface ChipState {
  chips: Record<string, number>;
  pot: number;
  bets: Record<string, number>;
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  justReconnected: boolean;
  gameEnded: boolean;
  socket: Socket | null;
  _token: string | null;
  _roomId: string | null;

  connect: (token: string, roomId: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  placeBet: (amount: number) => void;
  collectPot: () => void;
  splitPot: (participantIds: string[]) => void;
  transferOwner: (newHostUserId: string) => Promise<{ success: boolean; error?: string; newHostNickname?: string }>;
  endGame: () => Promise<{ success: boolean; error?: string }>;
  reset: () => void;
}

export const useChipStore = create<ChipState>((set, get) => ({
  chips: {},
  pot: 0,
  bets: {},
  connected: false,
  reconnecting: false,
  reconnectAttempts: 0,
  justReconnected: false,
  gameEnded: false,
  socket: null,
  _token: null,
  _roomId: null,

  connect: (token: string, roomId: string) => {
    const socket = connectSocket(token, roomId);
    set({ _token: token, _roomId: roomId });

    socket.on('connect', () => {
      set({ connected: true, reconnecting: false, reconnectAttempts: 0 });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('reconnect_attempt', () => {
      set({ reconnecting: true, reconnectAttempts: get().reconnectAttempts + 1 });
    });

    socket.on('reconnect', () => {
      set({ connected: true, reconnecting: false, reconnectAttempts: 0, justReconnected: true });
    });

    socket.on('reconnect_failed', () => {
      set({ reconnecting: false, reconnectAttempts: 0 });
    });

    socket.on('room-state', (state: { chips: Record<string, number>; pot: number; bets: Record<string, number>; players?: { userId: string; nickname: string }[]; hostUserId?: string }) => {
      set({ chips: state.chips, pot: state.pot, bets: state.bets });
      if (state.players && state.hostUserId) {
        useRoomStore.getState().updatePlayersAndHost(state.players, state.hostUserId);
      }
    });

    socket.on('player-joined', (data: { userId: string; nickname: string }) => {
      useRoomStore.getState().addPlayer(data);
    });

    socket.on('player-left', (data: { userId: string }) => {
      useRoomStore.getState().removePlayer(data.userId);
    });

    socket.on('bet-placed', (state: { chips: Record<string, number>; pot: number; bets: Record<string, number> }) => {
      set({ chips: state.chips, pot: state.pot, bets: state.bets });
    });

    socket.on('pot-collected', (state: { chips: Record<string, number>; pot: number; bets: Record<string, number> }) => {
      set({ chips: state.chips, pot: state.pot, bets: state.bets });
    });

    socket.on('pot-split', (state: { chips: Record<string, number>; pot: number; bets: Record<string, number> }) => {
      set({ chips: state.chips, pot: state.pot, bets: state.bets });
    });

    socket.on('owner-transferred', (data: { newHostUserId: string; newHostNickname: string }) => {
      const room = useRoomStore.getState().room;
      if (room) {
        useRoomStore.getState().updatePlayersAndHost(room.players, data.newHostUserId);
      }
    });

    socket.on('game-ended', (data: { roomId: string; players: { userId: string; nickname: string; chips: number }[]; totalCheck: boolean }) => {
      useRoomStore.setState({ settlement: data });
      set({ gameEnded: true });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
    }
    disconnectSocket();
    set({ socket: null, connected: false, _token: null, _roomId: null });
  },

  manualReconnect: () => {
    const { _token, _roomId } = get();
    if (_token && _roomId) {
      get().disconnect();
      get().connect(_token, _roomId);
    }
  },

  placeBet: (amount: number) => {
    const { socket } = get();
    socket?.emit('place-bet', { amount }, (res: { success: boolean; error?: string }) => {
      if (!res.success) {
        console.error('place-bet failed:', res.error);
      }
    });
  },

  collectPot: () => {
    const { socket } = get();
    socket?.emit('collect-pot', {}, (res: { success: boolean; error?: string }) => {
      if (!res.success) {
        console.error('collect-pot failed:', res.error);
      }
    });
  },

  splitPot: (participantIds: string[]) => {
    const { socket } = get();
    socket?.emit('split-pot', { participantIds }, (res: { success: boolean; error?: string }) => {
      if (!res.success) {
        console.error('split-pot failed:', res.error);
      }
    });
  },

  transferOwner: (newHostUserId: string) => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve({ success: false, error: '未连接' });
        return;
      }
      socket.emit('transfer-owner', { newHostUserId }, (res: { success: boolean; error?: string; newHostNickname?: string }) => {
        resolve(res);
      });
    });
  },

  endGame: () => {
    return new Promise((resolve) => {
      const { socket } = get();
      if (!socket) {
        resolve({ success: false, error: '未连接' });
        return;
      }
      socket.emit('end-game', {}, (res: { success: boolean; error?: string }) => {
        resolve(res);
      });
    });
  },

  reset: () => {
    set({ chips: {}, pot: 0, bets: {}, connected: false, reconnecting: false, reconnectAttempts: 0, justReconnected: false, gameEnded: false, socket: null, _token: null, _roomId: null });
  },
}));
