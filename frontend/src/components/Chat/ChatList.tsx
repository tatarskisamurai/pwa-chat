import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChatList, useUsersList, useCreateChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatMessageDate } from '@/utils/dateFormatter';
import { Loader } from '@/components/Common/Loader';
import { Avatar } from '@/components/Common/Avatar';
import { GroupParticipants } from './GroupParticipants';
import type { Chat } from '@/types/chat';
import type { User } from '@/types/user';

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatList({ selectedChatId, onSelectChat }: ChatListProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedForGroup, setSelectedForGroup] = useState<User[]>([]);
  const [participantsChatId, setParticipantsChatId] = useState<string | null>(null);
  const { data: chats, isLoading: chatsLoading } = useChatList();
  const { data: searchUsers, isLoading: searchLoading, isError: searchError, error: searchErr } = useUsersList(searchQuery);
  const createChat = useCreateChat();

  const isSearch = searchQuery.trim().length >= 1;
  const showSearchResults = isSearch && !creatingGroup;

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

  const toggleUserForGroup = (u: User) => {
    setSelectedForGroup((prev) =>
      prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name || selectedForGroup.length === 0) return;
    try {
      const chat = await createChat.mutateAsync({
        type: 'group',
        name,
        member_ids: selectedForGroup.map((u) => u.id),
      });
      onSelectChat(chat.id);
      setCreatingGroup(false);
      setGroupName('');
      setSelectedForGroup([]);
    } catch {
      // todo: toast
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
      {/* Зелёная верхушка */}
      <div
        className="sticky top-0 z-10 shrink-0 bg-green-600 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:p-4 md:pt-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-semibold text-white">Друн чат</h1>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              className="min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/15 hover:text-white md:py-1.5"
              title="Настройки"
            >
              Настройки
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/15 hover:text-white md:py-1.5"
              title="Выйти"
            >
              Выход
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/15 py-2 pl-2 pr-3">
          <Avatar alt={user?.username ?? ''} size="sm" src={user?.avatar} />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{user?.username}</span>
            <span className="text-xs text-white/80">@{user?.handle ?? user?.username}</span>
          </div>
        </div>
        <input
          type="text"
          placeholder={creatingGroup ? 'Поиск участников по нику' : 'Поиск по нику'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white/90 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        {!creatingGroup && (
          <button
            type="button"
            onClick={() => setCreatingGroup(true)}
            className="mt-2 w-full rounded-xl bg-white/15 py-2.5 text-sm font-medium text-white hover:bg-white/25"
          >
            Создать групповой чат
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {creatingGroup ? (
          <div className="flex flex-col p-3">
            <button
              type="button"
              onClick={() => { setCreatingGroup(false); setSelectedForGroup([]); setGroupName(''); setSearchQuery(''); }}
              className="mb-3 self-start rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
            >
              ← Назад
            </button>
            <h2 className="mb-3 text-base font-semibold text-gray-800">Новый групповой чат</h2>
            <input
              type="text"
              placeholder="Название группы"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mb-4 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {selectedForGroup.length > 0 && (
              <p className="mb-2 text-sm text-gray-600">Участники: {selectedForGroup.map((u) => u.username).join(', ')}</p>
            )}
            {isSearch ? (
              searchLoading ? (
                <Loader />
              ) : !searchUsers?.length ? (
                <p className="py-4 text-center text-sm text-gray-500">Никого не найдено</p>
              ) : (
                <ul className="space-y-1">
                  {searchUsers
                    .filter((u) => u.id !== user?.id)
                    .map((u) => {
                      const selected = selectedForGroup.some((x) => x.id === u.id);
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => toggleUserForGroup(u)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                              selected ? 'bg-green-100 ring-1 ring-green-300' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar alt={u.username} size="md" src={u.avatar} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900">{u.username}</p>
                              <p className="text-sm text-gray-500">@{u.handle}</p>
                            </div>
                            {selected && <span className="text-green-600">✓</span>}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )
            ) : (
              <p className="py-4 text-sm text-gray-500">Введите ник в поиске выше, чтобы добавить участников.</p>
            )}
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedForGroup.length === 0 || createChat.isPending}
              className="mt-4 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createChat.isPending ? 'Создание…' : 'Создать группу'}
            </button>
          </div>
        ) : showSearchResults ? (
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
              <p className="p-4 text-center text-sm text-gray-500">По такому запросу никого не нашли. Попробуйте другой ник.</p>
            ) : (
              <ul className="p-2">
                {searchUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      disabled={createChat.isPending}
                      className="flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-800 transition hover:bg-gray-100 disabled:opacity-50 md:py-2.5"
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
              <p className="p-6 text-center text-sm text-gray-500">Чатов пока нет. Введите в поиске ник или создайте групповой чат.</p>
            ) : (
              <ul className="p-2">
                {chats.map((chat: Chat) => (
                  <li key={chat.id}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectChat(chat.id)}
                        className={`flex min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          selectedChatId === chat.id ? 'bg-green-50 text-gray-900' : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        {chat.type === 'group' ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </div>
                        ) : (
                          <Avatar alt={chat.display_name || chat.name || chat.id} size="md" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {chat.display_name || chat.name || `Чат ${chat.id.slice(0, 8)}`}
                          </p>
                          {chat.type === 'group' && chat.members_count != null && (
                            <p className="text-xs text-gray-500">{chat.members_count} участников</p>
                          )}
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
                      {chat.type === 'group' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setParticipantsChatId(chat.id); }}
                          className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                          title="Участники"
                          aria-label="Участники"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {participantsChatId && (() => {
        const chat = chats?.find((c) => c.id === participantsChatId);
        return (
          <GroupParticipants
            chatId={participantsChatId}
            chatName={chat?.display_name ?? chat?.name ?? null}
            onClose={() => setParticipantsChatId(null)}
          />
        );
      })()}
    </div>
  );
}
