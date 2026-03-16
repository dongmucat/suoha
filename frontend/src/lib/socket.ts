import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9092';

let socket: Socket | null = null;

export function getSocket(token?: string, roomId?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: token && roomId ? { token, roomId } : undefined,
    });
  }
  return socket;
}

export function connectSocket(token: string, roomId: string): Socket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: { token, roomId },
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
