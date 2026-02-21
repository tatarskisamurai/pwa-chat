import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
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
import type { Message } from '@/types/chat';

interface ChatWindowProps {
  chatId: string | null;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const qc = useQueryClient();
  const { data: messages, isLoading } = useMessages(chatId);
  const sendMessageRest = useSendMessage(chatId ?? '');
  const bottomRef = useRef<HTMLDivElement>(null);

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
      <div className="flex flex-1 items-center justify-center bg-slate-900 text-slate-400">
        Выберите чат
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
    <div className="flex flex-1 flex-col bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
