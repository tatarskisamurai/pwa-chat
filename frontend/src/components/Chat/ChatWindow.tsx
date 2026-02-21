import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useChat,
  useMessages,
  useSendMessage,
  sortMessagesByTime,
  normalizeMessage,
  applyRealMessage,
  TEMP_ID_PREFIX,
} from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { getSocket } from '@/services/socket';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Loader } from '@/components/Common/Loader';
import { Avatar } from '@/components/Common/Avatar';
import type { Message } from '@/types/chat';

interface ChatWindowProps {
  chatId: string | null;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const qc = useQueryClient();
  const { data: chat } = useChat(chatId);
  const { data: messages, isLoading } = useMessages(chatId);
  const sendMessageRest = useSendMessage(chatId ?? '');
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatTitle = chat?.display_name || chat?.name || (chatId ? `Чат ${chatId.slice(0, 8)}` : null);

  const sortedMessages = useMemo(
    () => sortMessagesByTime(messages ?? []),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages]);

  useEffect(() => {
    if (!chatId || !socket || !user?.id) return;
    const currentUserId = user.id;
    const handler = (payload: Message & { chatId?: string }) => {
      const msgChatId = String(payload.chat_id ?? payload.chatId ?? '').toLowerCase();
      if (msgChatId !== chatId.toLowerCase()) return;
      const msg = normalizeMessage(payload as Message);
      qc.setQueryData<Message[]>(['messages', chatId], (old) =>
        applyRealMessage(old, msg, currentUserId)
      );
      qc.invalidateQueries({ queryKey: ['chats'] });
    };
    socket.on('new_message', handler);
    return () => {
      socket.off('new_message', handler);
    };
  }, [chatId, socket, qc, user?.id]);

  if (!chatId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-100 px-6 text-center">
        <div className="mb-4 rounded-full bg-gray-200 p-5">
          <svg className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-700">Друн чат</h2>
        <p className="mt-1 max-w-xs text-sm text-gray-500">Выберите чат в списке или найдите человека по @id в поиске.</p>
      </div>
    );
  }

  if (isLoading) return <Loader />;

  const handleSend = async (content: string) => {
    const queryKey = ['messages', chatId] as const;
    const optimistic: Message = {
      id: `${TEMP_ID_PREFIX}${Date.now()}`,
      chat_id: chatId,
      user_id: user?.id ?? '',
      content,
      type: 'text',
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<Message[]>(queryKey, (old) =>
      sortMessagesByTime([...(old ?? []), optimistic])
    );

    if (connected) {
      getSocket()?.emit('send_message', { chat_id: chatId, content });
      return;
    }
    await sendMessageRest.mutateAsync({
      content,
      currentUserId: user?.id,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-100">
      {/* Шапка чата — липкая, не уезжает при прокрутке */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shadow-sm md:gap-3 md:px-4 md:py-3 md:pt-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 touch-manipulation items-center gap-1 rounded-lg py-2 pr-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Назад к чатам"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Назад</span>
          </button>
        ) : null}
        <Avatar alt={chatTitle ?? ''} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-gray-800">{chatTitle}</h1>
          <p className="text-xs text-gray-500">в сети</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3 md:p-4">
        {sortedMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === user?.id}
            showAuthor={sortedMessages.some((m) => m.user_id !== msg.user_id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput
        chatId={chatId}
        onSend={handleSend}
        disabled={sendMessageRest.isPending}
      />
    </div>
  );
}
