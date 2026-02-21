/**
 * Нативный WebSocket к FastAPI (/api/ws).
 * Один бэкенд, без Node. Токен в query.
 */
import { storage } from './storage';

const API_URL = import.meta.env.VITE_API_URL || '';
const WS_BASE =
  API_URL
    ? API_URL.replace(/^http/, 'ws')
    : (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
        : 'ws://localhost:8000');

type EventHandler = (data: unknown) => void;

interface SocketLike {
  connected: boolean;
  emit: (event: string, data?: Record<string, unknown>) => void;
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
}

let ws: WebSocket | null = null;
let token: string | null = null;
const listeners: Record<string, Set<EventHandler>> = {};
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(t: string): string {
  const url = new URL('/api/ws', WS_BASE);
  url.searchParams.set('token', t);
  return url.toString();
}

function emitEvent(event: string, data: unknown): void {
  const set = listeners[event];
  if (!set) return;
  set.forEach((h) => {
    try {
      h(data);
    } catch (e) {
      console.error('[Socket] handler error:', e);
    }
  });
}

function clearWs(): void {
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    try {
      ws.close();
    } catch {}
    ws = null;
  }
}

const socketImpl: SocketLike = {
  get connected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  },
  emit(event: string, data?: Record<string, unknown>): void {
    if (ws?.readyState !== WebSocket.OPEN) return;
    const payload = data ? { type: event, ...data } : { type: event };
    ws.send(JSON.stringify(payload));
  },
  on(event: string, handler: EventHandler): void {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(handler);
  },
  off(event: string, handler: EventHandler): void {
    listeners[event]?.delete(handler);
  },
};

function connectSocket(tokenOrUndefined?: string | null): SocketLike {
  const t = tokenOrUndefined ?? storage.getToken();
  if (!t || typeof t !== 'string') {
    throw new Error('No token: нужен токен для WebSocket (localStorage["chat_token"] или из AuthContext)');
  }
  if (ws?.readyState === WebSocket.OPEN) return socketImpl;
  token = t;
  clearWs();
  ws = new WebSocket(getWsUrl(t));

  ws.onopen = () => {
    emitEvent('connect', {});
  };
  ws.onclose = () => {
    emitEvent('disconnect', {});
  };
  ws.onerror = () => {
    emitEvent('connect_error', new Error('WebSocket error'));
  };
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data as string);
      const type = data?.type;
      if (type === 'new_message' && data.message != null) {
        emitEvent('new_message', data.message);
      } else if (type === 'chats_updated') {
        emitEvent('chats_updated', {});
      }
    } catch {}
  };

  return socketImpl;
}

export function getSocket(): SocketLike | null {
  return ws ? socketImpl : null;
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { getSocket?: () => SocketLike | null }).getSocket = getSocket;
}

export { connectSocket };

export function disconnectSocket(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  clearWs();
  token = null;
}
