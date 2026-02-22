import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';

export type AttachmentToSend = { url: string; type?: string; filename?: string };

interface MessageInputProps {
  chatId: string;
  onSend: (content: string, attachments?: AttachmentToSend[]) => Promise<void>;
  disabled?: boolean;
}

const UNSUPPORTED_MSG = 'Вложение не поддерживается';

export function MessageInput({ chatId, onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const hasFiles = pendingFiles.length > 0;
    if ((!trimmed && !hasFiles) || disabled) return;
    setError('');
    const filesToSend = [...pendingFiles];
    setText('');
    setPendingFiles([]);
    const socket = getSocket();
    socket?.emit('typing:stop', { chatId });
    try {
      let attachments: AttachmentToSend[] | undefined;
      if (filesToSend.length > 0) {
        const { files } = await api.uploadFiles(filesToSend);
        attachments = files;
      }
      await onSend(trimmed, attachments);
    } catch (e) {
      const msg = e instanceof Error ? e.message : UNSUPPORTED_MSG;
      const isNetwork =
        msg === 'Failed to fetch' ||
        msg.toLowerCase().includes('aborted') ||
        msg.toLowerCase().includes('network');
      setError(isNetwork ? 'Не удалось отправить. Проверьте соединение или попробуйте позже.' : msg);
    }
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

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length === 0) return;
    setError('');
    setPendingFiles((prev) => [...prev, ...list].slice(0, 10));
    e.target.value = '';
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = text.trim() || pendingFiles.length > 0;

  return (
    <div className="flex flex-col gap-2 border-t border-gray-400 bg-gray-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-sm"
            >
              {f.name}
              <button
                type="button"
                onClick={() => removePending(i)}
                className="text-gray-500 hover:text-red-600"
                aria-label="Убрать"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={addFiles}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="min-h-[44px] shrink-0 touch-manipulation rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          aria-label="Прикрепить файл"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.12 0l2.12-2.12" />
          </svg>
        </button>
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
          disabled={disabled || !canSend}
          className="min-h-[44px] shrink-0 touch-manipulation rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
