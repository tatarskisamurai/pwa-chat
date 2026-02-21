import { useState } from 'react';
import { useChatList, useUsersList, useCreateChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatMessageDate } from '@/utils/dateFormatter';
import { Loader } from '@/components/Common/Loader';
import { Avatar } from '@/components/Common/Avatar';
import type { Chat } from '@/types/chat';
import type { User } from '@/types/user';

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatList({ selectedChatId, onSelectChat }: ChatListProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: chats, isLoading: chatsLoading } = useChatList();
  const { data: searchUsers, isLoading: searchLoading, isError: searchError, error: searchErr } = useUsersList(searchQuery);
  const createChat = useCreateChat();

  const isSearch = searchQuery.trim().length >= 1;
  const showSearchResults = isSearch;

  const handleSelectUser = async (u: User) => {
    try {
      const chat = await createChat.mutateAsync({
        type: 'private',
        member_ids: [u.id],
      });
      onSelectChat(chat.id);
      setSearchQuery('');
    } catch {
      // todo: toast
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
      <div
        className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-gray-50 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:p-4 md:pt-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-semibold text-gray-800">Друн чат</h1>
          <button
            type="button"
            onClick={() => logout()}
            className="min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 md:py-1.5"
            title="Выйти"
          >
            Выход
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white py-2 pl-2 pr-3">
          <Avatar alt={user?.username ?? ''} size="sm" src={user?.avatar} />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-800">{user?.username}</span>
            <span className="text-xs text-gray-500">@{user?.handle ?? user?.username}</span>
          </div>
        </div>
        <input
          type="text"
          placeholder="Найти по @id пользователя"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {showSearchResults ? (
          <>
            {searchLoading ? (
              <Loader />
            ) : searchError ? (
              <p className="p-4 text-center text-sm text-red-600">
                Ошибка поиска.{' '}
                {searchErr instanceof Error && searchErr.message
                  ? searchErr.message
                  : 'Проверьте авторизацию и повторите попытку.'}
              </p>
            ) : !searchUsers?.length ? (
              <p className="p-4 text-center text-sm text-gray-500">По такому запросу никого не нашли. Попробуйте другой @id.</p>
            ) : (
              <ul className="p-1">
                {searchUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      disabled={createChat.isPending}
                      className="flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-800 transition hover:bg-gray-50 disabled:opacity-50 md:py-2.5"
                    >
                      <Avatar alt={u.username} size="md" src={u.avatar} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{u.username}</p>
                        <p className="text-sm text-gray-500">@{u.handle}</p>
                      </div>
                      <span className="text-xs font-medium text-green-600">Написать</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {chatsLoading ? (
              <Loader />
            ) : !chats?.length ? (
              <p className="p-6 text-center text-sm text-gray-500">Чатов пока нет. Введите в поиске @id человека — например @ivan — и нажмите на него, чтобы начать диалог.</p>
            ) : (
              <ul>
                {chats.map((chat: Chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={`flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        selectedChatId === chat.id ? 'bg-green-100 text-gray-900 ring-1 ring-green-200' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Avatar alt={chat.display_name || chat.name || chat.id} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {chat.display_name || chat.name || `Чат ${chat.id.slice(0, 8)}`}
                        </p>
                        {chat.last_message && (
                          <p className="truncate text-sm text-gray-500">
                            {chat.last_message.content || '—'}
                          </p>
                        )}
                      </div>
                      {chat.last_message && (
                        <span className="text-xs text-gray-500">
                          {formatMessageDate(chat.last_message.created_at)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
