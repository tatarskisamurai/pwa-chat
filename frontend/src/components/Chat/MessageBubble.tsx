import { useEffect, useRef, useState } from 'react';
import { formatMessageDate } from '@/utils/dateFormatter';
import type { Message } from '@/types/chat';

const URL_REGEX = /(https?:\/\/[^\s<>]+)/g;

/** Десктоп: просто подчёркнутая ссылка. Мобилка (≤768px): таблетка, чтобы было видно. */
const linkClass = (isOwn: boolean) =>
  isOwn
    ? 'underline break-all text-green-100 decoration-green-200 cursor-pointer inline-block py-0.5 min-h-[2em] max-[768px]:rounded-md max-[768px]:bg-white/25 max-[768px]:px-1.5 max-[768px]:py-0.5'
    : 'underline break-all text-blue-600 decoration-blue-400 cursor-pointer inline-block py-0.5 min-h-[2em] max-[768px]:rounded-md max-[768px]:bg-blue-100 max-[768px]:text-blue-700 max-[768px]:px-1.5 max-[768px]:py-0.5';

/** Разбивает текст на фрагменты и превращает URL в кликабельные ссылки. */
function linkify(text: string, isOwn: boolean): (string | React.ReactElement)[] {
  if (!text) return [];
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const href = part.replace(/[.,;:)\]}>]+$/, '');
      const trailing = part.slice(href.length);
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass(isOwn)}
            style={
              (isOwn
                ? { WebkitTapHighlightColor: 'rgba(255,255,255,0.3)' }
                : { WebkitTapHighlightColor: 'rgba(0,0,0,0.08)' }) as React.CSSProperties
            }
            onClick={(e) => e.stopPropagation()}
          >
            {href}
            <span className="ml-0.5 opacity-80 md:hidden" aria-hidden>↗</span>
          </a>
          {trailing}
        </span>
      );
    }
    return part;
  });
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAuthor?: boolean;
  onSaveEdit?: (messageId: string, content: string | null) => void;
  onDelete?: (messageId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
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

export function MessageBubble({
  message,
  isOwn,
  showAuthor,
  onSaveEdit,
  onDelete,
  isUpdating,
  isDeleting,
}: MessageBubbleProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content ?? '');
  const objectUrlsToRevoke = useRef<Set<string>>(new Set());
  const delayedRevokeTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const canEditDelete = isOwn && (onSaveEdit != null || onDelete != null);
  const showMenu = canEditDelete && !editing;

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

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    onSaveEdit?.(message.id, trimmed || null);
    setEditing(false);
    setMenuOpen(false);
  };

  return (
    <div className={`${wrapperClass} group`}>
      <div className={bubbleClass}>
        {showAuthor && !isOwn && (
          <p className="mb-0.5 text-xs font-medium text-gray-600">{message.user_id}</p>
        )}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full resize-none rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white/50 focus:outline-none"
              rows={3}
              placeholder="Текст сообщения"
              autoFocus
              disabled={isUpdating}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating || (editText.trim() === (message.content ?? '').trim())}
                className="rounded-lg bg-white/25 px-3 py-1.5 text-sm font-medium hover:bg-white/35 disabled:opacity-50"
              >
                {isUpdating ? '…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditText(message.content ?? ''); setMenuOpen(false); }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/15"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-end gap-1">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{linkify(message.content || '', isOwn)}</p>
              {showMenu && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="rounded p-1 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
                    aria-label="Действия"
                    disabled={isDeleting}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {onSaveEdit && (
                          <button
                            type="button"
                            onClick={() => { setEditing(true); setEditText(message.content ?? ''); setMenuOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Редактировать
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => { onDelete(message.id); setMenuOpen(false); }}
                            disabled={isDeleting}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeleting ? '…' : 'Удалить'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {!editing && message.attachments && message.attachments.length > 0 ? (
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
          {message.updated_at && new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() && (
            <span className="ml-1 opacity-80">(ред.)</span>
          )}
        </p>
      </div>
    </div>
  );
}
