import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket';

interface SocketContextValue {
  socket: ReturnType<typeof getSocket>;
  connected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      return;
    }
    let s: ReturnType<typeof connectSocket>;
    try {
      s = connectSocket(token);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Socket] connectSocket failed:', e);
      setSocket(null);
      setConnected(false);
      return;
    }
    setSocket(s);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => {
      if (import.meta.env.DEV) console.error('[Socket] connect_error:', err.message);
    };
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);
    if (s.connected) setConnected(true);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
    };
  }, [token]);

  const joinChat = useCallback((chatId: string) => {
    getSocket()?.emit('join_chat', { chat_id: chatId });
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    getSocket()?.emit('leave_chat', { chat_id: chatId });
  }, []);

  const value: SocketContextValue = { socket, connected, joinChat, leaveChat };
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
