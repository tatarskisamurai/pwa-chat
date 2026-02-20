import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail, isValidPassword, isValidUsername } from '@/utils/validators';

interface FormData {
  username: string;
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
      await registerUser(data.username, data.email, data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-slate-800/50 p-6 shadow-xl">
      <h2 className="mb-4 text-xl font-semibold text-white">Регистрация</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Имя пользователя"
            className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            {...register('username', {
              required: 'Введите имя',
              validate: (v) => isValidUsername(v) || 'Латиница, цифры, 2+ символа',
            })}
          />
          {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
        </div>
        <div>
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white transition hover:bg-sky-500"
        >
          Зарегистрироваться
        </button>
        <p className="mt-3 text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-sky-400 hover:underline">Вход</Link>
        </p>
      </form>
    </div>
  );
}
