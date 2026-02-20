import { useChatList } from '@/hooks/useChat';
import { formatMessageDate } from '@/utils/dateFormatter';
import { Loader } from '@/components/Common/Loader';
import { Avatar } from '@/components/Common/Avatar';
import type { Chat } from '@/types/chat';

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatList({ selectedChatId, onSelectChat }: ChatListProps) {
  const { data: chats, isLoading } = useChatList();

  if (isLoading) return <Loader />;

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-slate-700 bg-slate-800/30">
      <div className="sticky top-0 border-b border-slate-700 bg-slate-800/80 p-3">
        <h1 className="text-lg font-semibold text-white">Чаты</h1>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {chats?.map((chat: Chat) => (
          <li key={chat.id}>
            <button
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                selectedChatId === chat.id ? 'bg-sky-600/20 text-white' : 'text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Avatar alt={chat.name || chat.id} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {chat.name || `Чат ${chat.id.slice(0, 8)}`}
                </p>
                {chat.last_message && (
                  <p className="truncate text-sm text-slate-400">
                    {chat.last_message.content || '—'}
                  </p>
                )}
              </div>
              {chat.last_message && (
                <span className="text-xs text-slate-500">
                  {formatMessageDate(chat.last_message.created_at)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
