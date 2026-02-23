import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Common/Avatar';
import { api } from '@/services/api';
import type { User } from '@/types/user';

const ACCEPT_AVATAR = 'image/jpeg,image/png,image/gif,image/webp';

export function Settings() {
  const { user, logout, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      setAvatarError('Выберите изображение (JPG, PNG, GIF или WebP)');
      return;
    }
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const { files } = await api.uploadFiles([file]);
      if (!files?.length) throw new Error('Не удалось загрузить файл');
      const avatarUrl = files[0].url;
      const updated = await api.patch<User>('/api/users/me', { avatar: avatarUrl });
      updateUser(updated);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Ошибка загрузки аватарки');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-200 md:min-h-screen">
      {/* Шапка в стиле чата */}
      <header
        className="sticky top-0 z-10 flex shrink-0 items-center gap-3 bg-green-600 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-4 md:py-4"
      >
        <Link
          to="/"
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg text-white/90 hover:bg-white/15 hover:text-white"
          aria-label="Назад"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-lg font-semibold text-white">Настройки</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500">Профиль</h2>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_AVATAR}
              className="hidden"
              onChange={handleAvatarChange}
              disabled={avatarLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="relative shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-green-300 focus:ring-green-400 focus:outline-none disabled:opacity-50"
              aria-label="Сменить аватарку"
            >
              <Avatar alt={user?.username ?? ''} size="lg" src={user?.avatar} />
              {avatarLoading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                  …
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{user?.username}</p>
              <p className="text-sm text-gray-500">@{user?.handle ?? user?.username}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="mt-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
              >
                {avatarLoading ? 'Загрузка…' : 'Сменить аватарку'}
              </button>
              {avatarError && <p className="mt-1 text-sm text-red-600">{avatarError}</p>}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500">Аккаунт</h2>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full touch-manipulation rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Выйти из аккаунта
          </button>
        </section>
      </main>
    </div>
  );
}
