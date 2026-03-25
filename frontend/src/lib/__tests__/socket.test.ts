import { beforeEach, describe, expect, it, vi } from 'vitest';

const ioMock = vi.fn(() => ({
  disconnect: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

describe('socket connection config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    ioMock.mockClear();
  });

  it('defaults to same-origin socket.io path when no env override is set', async () => {
    const { connectSocket } = await import('@/lib/socket');

    connectSocket('token-1', 'room-1');

    expect(ioMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        path: '/socket.io',
        autoConnect: true,
        transports: ['websocket', 'polling'],
        query: { token: 'token-1', roomId: 'room-1' },
      }),
    );
  });

  it('uses VITE_SOCKET_URL when explicitly configured', async () => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://ws.example.com');

    const { connectSocket } = await import('@/lib/socket');

    connectSocket('token-2', 'room-2');

    expect(ioMock).toHaveBeenCalledWith(
      'https://ws.example.com',
      expect.objectContaining({
        path: '/socket.io',
        query: { token: 'token-2', roomId: 'room-2' },
      }),
    );
  });
});
