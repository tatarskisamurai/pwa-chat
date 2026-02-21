import { io, Socket } from 'socket.io-client';
import { storage } from './storage';

// Токен хранится в localStorage под ключом 'chat_token' (storage.getToken())
// Для сокета нужен URL Node.js сервера (Socket.io), не FastAPI
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { getSocket?: () => Socket | null }).getSocket = getSocket;
}

/**
 * Подключает сокет с токеном авторизации.
 * Токен можно передать явно (из AuthContext) или будет взят из storage (localStorage['chat_token']).
 */
export function connectSocket(tokenOrUndefined?: string | null): Socket {
  const token = tokenOrUndefined ?? storage.getToken();
  if (!token || typeof token !== 'string') {
    throw new Error('No token: нужен токен авторизации для сокета (localStorage["chat_token"] или из AuthContext)');
  }
  if (socket) return socket;
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
