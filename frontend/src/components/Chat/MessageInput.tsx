import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { getSocket } from '@/services/socket';

interface MessageInputProps {
  chatId: string;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ chatId, onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const { joinChat, leaveChat } = useSocket();
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = getSocket();
    joinChat(chatId);
    if (s) {
      const onConnect = () => joinChat(chatId);
      s.on('connect', onConnect);
      if (s.connected) joinChat(chatId);
      return () => {
        s.off('connect', onConnect);
        leaveChat(chatId);
      };
    }
    return () => leaveChat(chatId);
  }, [chatId, joinChat, leaveChat]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    const socket = getSocket();
    socket?.emit('typing:stop', { chatId });
    try {
      await onSend(trimmed);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const socket = getSocket();
    socket?.emit('typing:start', { chatId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('typing:stop', { chatId });
      typingTimeout.current = null;
    }, 2000);
  };

  return (
    <div
        className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3"
      >
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение..."
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 disabled:opacity-50"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
          className="min-h-[44px] shrink-0 touch-manipulation rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          Отправить
        </button>
      </div>
  );
}
