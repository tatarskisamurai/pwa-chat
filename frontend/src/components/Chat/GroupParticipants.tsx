import { useChatMembers, useLeaveChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Common/Avatar';
import { Loader } from '@/components/Common/Loader';
import type { ChatMemberWithUser } from '@/types/chat';

interface GroupParticipantsProps {
  chatId: string;
  chatName: string | null;
  onClose: () => void;
  onLeave?: () => void;
}

/** Просмотр участников группового чата. Доступно всем участникам группы. */
export function GroupParticipants({ chatId, chatName, onClose, onLeave }: GroupParticipantsProps) {
  const { user } = useAuth();
  const { data: members, isLoading } = useChatMembers(chatId);
  const leaveChat = useLeaveChat(chatId);

  const handleLeave = async () => {
    if (!user?.id) return;
    if (!window.confirm('Выйти из группы?')) return;
    try {
      await leaveChat.mutateAsync(user.id);
      onClose();
      onLeave?.();
    } catch {
      // todo: toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            Участники{chatName ? `: ${chatName}` : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <Loader />
          ) : (
            <ul className="space-y-1">
              {(members ?? []).map((m: ChatMemberWithUser) => (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50"
                >
                  <Avatar alt={m.username} size="md" src={m.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{m.username}</p>
                    <p className="text-sm text-gray-500">@{m.handle}</p>
                  </div>
                  {m.role === 'admin' && (
                    <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                      админ
                    </span>
                  )}
                  {String(m.user_id) === String(user?.id) && (
                    <button
                      type="button"
                      onClick={handleLeave}
                      disabled={leaveChat.isPending}
                      className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Выйти из группы
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
