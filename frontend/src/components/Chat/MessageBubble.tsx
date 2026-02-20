import { formatMessageDate } from '@/utils/dateFormatter';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAuthor?: boolean;
}

export function MessageBubble({ message, isOwn, showAuthor }: MessageBubbleProps) {
  const wrapperClass = isOwn ? 'flex justify-end' : 'flex justify-start';
  const bubbleClass = isOwn
    ? 'max-w-[75%] rounded-2xl px-4 py-2 bg-sky-600 text-white'
    : 'max-w-[75%] rounded-2xl px-4 py-2 bg-slate-700 text-slate-100';
  const timeClass = isOwn ? 'mt-1 text-xs text-sky-200' : 'mt-1 text-xs text-slate-400';

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}>
        {showAuthor && !isOwn && (
          <p className="mb-0.5 text-xs font-medium text-sky-300">{message.user_id}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content || ''}</p>
        {message.attachments && message.attachments.length > 0 ? (
          <div className="mt-2 space-y-1">
            {message.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm underline"
              >
                {a.filename || 'Вложение'}
              </a>
            ))}
          </div>
        ) : null}
        <p className={timeClass}>
          {formatMessageDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}
