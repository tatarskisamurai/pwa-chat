import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Chat, Message } from '@/types/chat';
import type { User } from '@/types/user';

export function useUsersList(search: string) {
  const term = search.replace(/^@/, '').trim().toLowerCase();
  return useQuery({
    queryKey: ['users', 'list', term],
    queryFn: () => api.get<User[]>(`/api/users/list?search=${encodeURIComponent(term)}`),
    enabled: term.length >= 1,
  });
}

export function useChatList() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get<Chat[]>('/api/chats'),
  });
}

export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => api.get<Chat>(`/api/chats/${chatId}`),
    enabled: !!chatId,
  });
}

/** Редкий refetch только как подстраховка при проблемах с сокетом */
const MESSAGES_REFETCH_MS = 10000;

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => api.get<Message[]>(`/api/messages/chat/${chatId}`),
    enabled: !!chatId,
    refetchInterval: chatId ? MESSAGES_REFETCH_MS : false,
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: string; name?: string; member_ids?: string[] }) =>
      api.post<Chat>('/api/chats', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] }),
  });
}

export function normalizeMessage(m: Message): Message {
  return {
    ...m,
    id: String(m.id),
    chat_id: String(m.chat_id),
    user_id: String(m.user_id),
    created_at:
      typeof m.created_at === 'string'
        ? m.created_at
        : (m as { created_at?: { toISOString?: () => string } }).created_at?.toISOString?.() ??
          new Date().toISOString(),
  };
}

/** Список сообщений всегда по времени: старые сверху, новые снизу */
export function sortMessagesByTime(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export const TEMP_ID_PREFIX = 'temp-';

/** Добавляет реальное сообщение в кэш: подменяет первый temp (если это наше) или добавляет в конец */
export function applyRealMessage(
  old: Message[] | undefined,
  real: Message,
  currentUserId: string
): Message[] {
  const msg = normalizeMessage(real);
  const list = old ?? [];
  const isOwn = String(msg.user_id) === String(currentUserId);
  if (isOwn) {
    const idx = list.findIndex((m) => String(m.id).startsWith(TEMP_ID_PREFIX));
    if (idx >= 0) {
      const next = [...list];
      next.splice(idx, 1, msg);
      return sortMessagesByTime(next);
    }
  }
  if (list.some((m) => String(m.id) === String(msg.id))) return list;
  return sortMessagesByTime([...list, msg]);
}

export type AttachmentInput = { url: string; type?: string; filename?: string };
export type SendMessageVars = {
  content: string;
  type?: string;
  attachments?: AttachmentInput[];
  currentUserId?: string;
};

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  const queryKey = ['messages', chatId] as const;

  return useMutation({
    mutationFn: (body: SendMessageVars) => {
      const { currentUserId: _u, ...rest } = body;
      return api.post<Message>(`/api/messages/chat/${chatId}`, rest);
    },
    onSuccess: (newMessage, variables) => {
      const uid = variables.currentUserId ?? '';
      qc.setQueryData<Message[]>(queryKey, (old) =>
        applyRealMessage(old, newMessage, uid)
      );
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateMessage(chatId: string) {
  const qc = useQueryClient();
  const queryKey = ['messages', chatId] as const;

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string | null }) =>
      api.patch<Message>(`/api/messages/${messageId}`, { content }),
    onSuccess: (updated) => {
      const msg = normalizeMessage(updated);
      qc.setQueryData<Message[]>(queryKey, (old) => {
        if (!old) return old;
        const next = old.map((m) => (String(m.id) === String(msg.id) ? msg : m));
        return sortMessagesByTime(next);
      });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useDeleteMessage(chatId: string) {
  const qc = useQueryClient();
  const queryKey = ['messages', chatId] as const;

  return useMutation({
    mutationFn: (messageId: string) => api.delete(`/api/messages/${messageId}`),
    onSuccess: (_, messageId) => {
      qc.setQueryData<Message[]>(queryKey, (old) => {
        if (!old) return old;
        return old.filter((m) => String(m.id) !== String(messageId));
      });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
