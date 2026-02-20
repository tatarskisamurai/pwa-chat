import { useEffect, useRef } from 'react';
import { useMessages, useSendMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Loader } from '@/components/Common/Loader';

interface ChatWindowProps {
  chatId: string | null;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useMessages(chatId);
  const sendMessage = useSendMessage(chatId!);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chatId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-900 text-slate-400">
        Выберите чат
      </div>
    );
  }

  if (isLoading) return <Loader />;

  const handleSend = async (content: string) => {
    await sendMessage.mutateAsync({ content });
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === user?.id}
            showAuthor={messages?.some((m) => m.user_id !== msg.user_id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput
        chatId={chatId}
        onSend={handleSend}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
