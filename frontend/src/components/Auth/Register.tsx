import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail, isValidPassword, isValidUsername, isValidHandle } from '@/utils/validators';

interface FormData {
  username: string;
  handle: string;
  email: string;
  password: string;
}

export function Register() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser(data.username, data.handle, data.email, data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
      <h2 className="mb-1 text-xl font-semibold text-gray-800">Регистрация</h2>
      <p className="mb-6 text-sm text-gray-500">Создайте аккаунт в Друн чат</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Как к вам обращаться"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
            {...register('username', {
              required: 'Введите имя',
              validate: (v) => isValidUsername(v) || 'Введите имя',
            })}
          />
          {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
        </div>
        <div>
          <input
            type="text"
            placeholder="@id — по нему вас найдут в поиске"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
            {...register('handle', {
              required: 'Введите ID',
              validate: (v) => isValidHandle(v) || 'Латиница, цифры, _, от 2 символов (без @)',
            })}
          />
          {errors.handle && <p className="mt-1 text-sm text-red-400">{errors.handle.message}</p>}
        </div>
        <div>
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
            {...register('email', {
              required: 'Введите email',
              validate: (v) => isValidEmail(v) || 'Некорректный email',
            })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
        </div>
        <div>
          <input
            type="password"
            placeholder="Пароль"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
            {...register('password', {
              required: 'Введите пароль',
              validate: (v) => isValidPassword(v) || 'Минимум 6 символов',
            })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-green-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-green-700"
        >
          Зарегистрироваться
        </button>
        <p className="mt-3 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-green-600 hover:underline">Вход</Link>
        </p>
      </form>
    </div>
  );
}
