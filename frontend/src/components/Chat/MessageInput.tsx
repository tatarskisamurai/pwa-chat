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
    <div className="flex gap-2 border-t border-slate-700 bg-slate-800/50 p-3">
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение..."
        rows={1}
        className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled || !text.trim()}
        className="rounded-xl bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
      >
        Отправить
      </button>
    </div>
  );
}
