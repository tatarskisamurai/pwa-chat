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
    ? 'max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-green-600 text-white shadow-sm sm:max-w-[80%]'
    : 'max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-white text-gray-800 shadow-sm sm:max-w-[80%]';
  const timeClass = isOwn ? 'mt-1.5 text-xs text-green-200' : 'mt-1.5 text-xs text-gray-500';

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}>
        {showAuthor && !isOwn && (
          <p className="mb-0.5 text-xs font-medium text-gray-600">{message.user_id}</p>
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
