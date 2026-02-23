import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useChat,
  useMessages,
  useSendMessage,
  useUpdateMessage,
  useDeleteMessage,
  useAddChatMembers,
  useUsersList,
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
import type { Chat, Message } from '@/types/chat';
import type { User } from '@/types/user';

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
  const updateMessage = useUpdateMessage(chatId ?? '');
  const deleteMessage = useDeleteMessage(chatId ?? '');
  const addChatMembers = useAddChatMembers(chatId ?? '');
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addMembersSearch, setAddMembersSearch] = useState('');
  const [addMembersSelected, setAddMembersSelected] = useState<User[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: addMembersUsers } = useUsersList(addMembersSearch);
  const canAddMembers = chat?.type === 'group' && chat?.current_user_role === 'admin';

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
    const handleUpdated = (payload: { message?: Message }) => {
      const msg = payload.message;
      if (!msg || String(msg.chat_id) !== chatId) return;
      const normalized = normalizeMessage(msg as Message);
      qc.setQueryData<Message[]>(['messages', chatId], (old) => {
        if (!old) return old;
        return sortMessagesByTime(
          old.map((m) => (String(m.id) === String(normalized.id) ? normalized : m))
        );
      });
      qc.invalidateQueries({ queryKey: ['chats'] });
    };
    const handleDeleted = (payload: { message_id?: string }) => {
      const id = payload.message_id;
      if (!id) return;
      qc.setQueryData<Message[]>(['messages', chatId], (old) =>
        old ? old.filter((m) => String(m.id) !== id) : old
      );
      qc.invalidateQueries({ queryKey: ['chats'] });
    };
    socket.on('message_updated', handleUpdated);
    socket.on('message_deleted', handleDeleted);
    return () => {
      socket.off('new_message', handler);
      socket.off('message_updated', handleUpdated);
      socket.off('message_deleted', handleDeleted);
    };
  }, [chatId, socket, qc, user?.id]);

  if (!chatId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-300 px-6 text-center">
        <div className="mb-4 rounded-full bg-gray-400/80 p-5">
          <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-700">Друн чат</h2>
        <p className="mt-1 max-w-xs text-sm text-gray-500">Выберите чат в списке или найдите человека по @id в поиске.</p>
      </div>
    );
  }

  if (isLoading) return <Loader />;

  const handleSend = async (content: string, attachments?: { url: string; type?: string; filename?: string }[]) => {
    const queryKey = ['messages', chatId] as const;
    const now = new Date().toISOString();
    const msgType = attachments?.length ? (attachments.some((a) => (a.type || '').startsWith('image/')) ? 'image' : 'file') : 'text';
    const optimistic: Message = {
      id: `${TEMP_ID_PREFIX}${Date.now()}`,
      chat_id: chatId,
      user_id: user?.id ?? '',
      content: content || null,
      type: msgType,
      created_at: now,
      attachments: attachments?.map((a, i) => ({ id: `temp-${i}`, url: a.url, type: a.type, filename: a.filename })) ?? [],
    };
    qc.setQueryData<Message[]>(queryKey, (old) =>
      sortMessagesByTime([...(old ?? []), optimistic])
    );
    const previewContent = content || (attachments?.length ? '📎 Вложение' : '');
    qc.setQueryData<Chat[]>(['chats'], (old) => {
      if (!old) return old;
      const updated = old.map((c) =>
        c.id === chatId
          ? { ...c, last_message: { id: optimistic.id, content: previewContent, created_at: now } }
          : c
      );
      const idx = updated.findIndex((c) => c.id === chatId);
      if (idx <= 0) return updated;
      const [item] = updated.splice(idx, 1);
      return [item, ...updated];
    });

    const useWs = connected && !attachments?.length;
    if (useWs) {
      getSocket()?.emit('send_message', { chat_id: chatId, content });
      return;
    }
    await sendMessageRest.mutateAsync({
      content: content || undefined,
      type: msgType,
      attachments,
      currentUserId: user?.id,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-300">
      {/* Зелёная верхушка — липкая */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 bg-green-600 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:gap-3 md:px-4 md:py-3 md:pt-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 touch-manipulation items-center gap-1 rounded-lg py-2 pr-2 text-white hover:bg-white/15 md:hidden"
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
          <h1 className="truncate font-semibold text-white">{chatTitle}</h1>
          <p className="text-xs text-white/85">
            {chat?.type === 'group' && chat?.members_count != null
              ? `${chat.members_count} участников`
              : 'в сети'}
          </p>
        </div>
        {canAddMembers && (
          <button
            type="button"
            onClick={() => setAddMembersOpen(true)}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15"
            aria-label="Добавить участников"
            title="Добавить участников"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        )}
      </header>

      {addMembersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Добавить в группу</h2>
              <button
                type="button"
                onClick={() => { setAddMembersOpen(false); setAddMembersSearch(''); setAddMembersSelected([]); }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Закрыть"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Поиск по нику"
                value={addMembersSearch}
                onChange={(e) => setAddMembersSearch(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {addMembersSelected.length > 0 && (
                <p className="mb-2 text-sm text-gray-600">
                  Выбрано: {addMembersSelected.map((u) => u.username).join(', ')}
                </p>
              )}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200">
                {addMembersSearch.trim().length < 1 ? (
                  <p className="p-4 text-center text-sm text-gray-500">Введите ник для поиска</p>
                ) : !addMembersUsers?.length ? (
                  <p className="p-4 text-center text-sm text-gray-500">Никого не найдено</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {(addMembersUsers as User[])
                      .filter((u) => u.id !== user?.id)
                      .map((u) => {
                        const selected = addMembersSelected.some((x) => x.id === u.id);
                        return (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setAddMembersSelected((prev) =>
                                  selected ? prev.filter((x) => x.id !== u.id) : [...prev, u]
                                )
                              }
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                                selected ? 'bg-green-50' : 'hover:bg-gray-50'
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
                )}
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-200 p-4">
              <button
                type="button"
                onClick={() => { setAddMembersOpen(false); setAddMembersSearch(''); setAddMembersSelected([]); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (addMembersSelected.length > 0) {
                    addChatMembers.mutate(addMembersSelected.map((u) => u.id), {
                      onSuccess: () => {
                        setAddMembersOpen(false);
                        setAddMembersSearch('');
                        setAddMembersSelected([]);
                      },
                    });
                  }
                }}
                disabled={addMembersSelected.length === 0 || addChatMembers.isPending}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {addChatMembers.isPending ? 'Добавление…' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-300 p-3 space-y-3 md:p-4">
        {sortedMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === user?.id}
            showAuthor={sortedMessages.some((m) => m.user_id !== msg.user_id)}
            onSaveEdit={(messageId, content) =>
              updateMessage.mutate({ messageId, content })
            }
            onDelete={(messageId) => {
              if (window.confirm('Удалить сообщение?')) deleteMessage.mutate(messageId);
            }}
            isUpdating={updateMessage.isPending}
            isDeleting={deleteMessage.isPending}
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
