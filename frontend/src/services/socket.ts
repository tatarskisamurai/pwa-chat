import { io, Socket } from 'socket.io-client';
import { storage } from './storage';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  const token = storage.getToken();
  if (!token) throw new Error('No token');
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    path: '/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
