import { io, type Socket } from 'socket.io-client';

const SOCKET_PATH = '/socket.io';

let socket: Socket | null = null;

function getSocketEndpoint(): string | undefined {
  const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
  return socketUrl ? socketUrl : undefined;
}

function createSocketOptions(token?: string, roomId?: string, autoConnect = false) {
  return {
    autoConnect,
    path: SOCKET_PATH,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: token && roomId ? { token, roomId } : undefined,
  };
}

export function getSocket(token?: string, roomId?: string): Socket {
  if (!socket) {
    socket = io(getSocketEndpoint(), createSocketOptions(token, roomId, false));
  }
  return socket;
}

export function connectSocket(token: string, roomId: string): Socket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(getSocketEndpoint(), createSocketOptions(token, roomId, true));
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
