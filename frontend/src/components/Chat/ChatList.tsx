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
    <div className="flex h-full flex-col overflow-hidden border-r border-slate-700 bg-slate-800/30">
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-700 bg-slate-800/95 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-semibold text-white">Чаты</h1>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Выйти"
          >
            Выход
          </button>
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Avatar alt={user?.username ?? ''} size="sm" src={user?.avatar} />
          <span className="truncate text-sm text-slate-300">{user?.username}</span>
          <span className="text-sm text-slate-500">@{user?.handle ?? user?.username}</span>
        </div>
        <input
          type="text"
          placeholder="Поиск по ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {showSearchResults ? (
          <>
            {searchLoading ? (
              <Loader />
            ) : searchError ? (
              <p className="p-4 text-center text-amber-400">
                Ошибка поиска.{' '}
                {searchErr instanceof Error && searchErr.message
                  ? searchErr.message
                  : 'Проверьте авторизацию и повторите попытку.'}
              </p>
            ) : !searchUsers?.length ? (
              <p className="p-4 text-center text-slate-400">Никого не найдено по ID</p>
            ) : (
              <ul className="p-1">
                {searchUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      disabled={createChat.isPending}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Avatar alt={u.username} size="md" src={u.avatar} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{u.username}</p>
                        <p className="text-sm text-sky-400">@{u.handle}</p>
                      </div>
                      <span className="text-xs text-slate-500">Написать</span>
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
              <p className="p-4 text-center text-slate-400">Чатов нет. Введите ID в поиске выше.</p>
            ) : (
              <ul>
                {chats.map((chat: Chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                        selectedChatId === chat.id ? 'bg-sky-600/20 text-white' : 'text-slate-200 hover:bg-slate-700/50'
                      }`}
                    >
                      <Avatar alt={chat.display_name || chat.name || chat.id} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {chat.display_name || chat.name || `Чат ${chat.id.slice(0, 8)}`}
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
