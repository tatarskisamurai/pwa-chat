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

export function useMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => api.get<Message[]>(`/api/messages/chat/${chatId}`),
    enabled: !!chatId,
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

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; type?: string }) =>
      api.post<Message>(`/api/messages/chat/${chatId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', chatId] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
