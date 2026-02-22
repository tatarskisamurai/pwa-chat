import { useEffect, useRef, useState } from 'react';
import { formatMessageDate } from '@/utils/dateFormatter';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAuthor?: boolean;
}

/** Задержка отзыва object URL для пустых файлов: на мобилке диалог «Скачать ещё раз?» может появиться с задержкой. */
const EMPTY_FILE_REVOKE_DELAY_MS = 60_000;

/**
 * Скачивает файл в фоне (без выхода из PWA).
 * Object URL отзывается: непустой — при размонтировании компонента; пустой — через EMPTY_FILE_REVOKE_DELAY_MS.
 */
async function downloadInBackground(
  url: string,
  filename: string,
  registerRevoke: (objectUrl: string) => void,
  registerRevokeDelayed: (objectUrl: string, delayMs: number) => void
): Promise<void> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  if (blob.size === 0) registerRevokeDelayed(objUrl, EMPTY_FILE_REVOKE_DELAY_MS);
  else registerRevoke(objUrl);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename || 'file';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function MessageBubble({ message, isOwn, showAuthor }: MessageBubbleProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const objectUrlsToRevoke = useRef<Set<string>>(new Set());
  const delayedRevokeTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      objectUrlsToRevoke.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsToRevoke.current.clear();
      delayedRevokeTimeouts.current.forEach((id, url) => {
        clearTimeout(id);
        URL.revokeObjectURL(url);
      });
      delayedRevokeTimeouts.current.clear();
    };
  }, []);

  const registerRevokeDelayed = (objectUrl: string, delayMs: number) => {
    const prev = delayedRevokeTimeouts.current.get(objectUrl);
    if (prev) clearTimeout(prev);
    const id = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      delayedRevokeTimeouts.current.delete(objectUrl);
    }, delayMs);
    delayedRevokeTimeouts.current.set(objectUrl, id);
  };
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
          <div className="mt-2 space-y-2">
            {message.attachments.map((a) => {
              const isImage = (a.type || '').startsWith('image/');
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const src = a.url.startsWith('http') ? a.url : `${origin}${a.url}`;
              const storedName = a.url.replace(/^.*\/api\/uploads\//, '') || '';
              const downloadUrl = storedName
                ? `${origin}/api/upload/download/${encodeURIComponent(storedName)}${a.filename ? `?filename=${encodeURIComponent(a.filename)}` : ''}`
                : src;
              const handleDownload = (e: React.MouseEvent) => {
                e.preventDefault();
                const name = a.filename || (isImage ? 'image' : 'file');
                setDownloading(a.id);
                const register = (objUrl: string) => objectUrlsToRevoke.current.add(objUrl);
                downloadInBackground(downloadUrl, name, register, registerRevokeDelayed)
                  .catch(() => {})
                  .finally(() => setDownloading(null));
              };

              return isImage ? (
                <div key={a.id} className="space-y-1">
                  <a href={src} target="_blank" rel="noopener noreferrer" className="block max-w-full">
                    <img
                      src={src}
                      alt={a.filename || 'Фото'}
                      className="max-h-64 rounded-lg object-contain"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!!downloading}
                    className="text-xs opacity-90 hover:opacity-100 disabled:opacity-50"
                  >
                    {downloading === a.id ? 'Скачивание…' : `Скачать ${a.filename || 'файл'}`}
                  </button>
                </div>
              ) : (
                <span key={a.id} className="block">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!!downloading}
                    className="inline-flex items-center gap-1.5 text-sm underline disabled:opacity-50"
                  >
                    <span>{a.filename || 'Вложение'}</span>
                    <span className="text-xs opacity-80">{downloading === a.id ? '…' : '↓'}</span>
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
        <p className={timeClass}>
          {formatMessageDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}
