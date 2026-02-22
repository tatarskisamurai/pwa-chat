import { storage } from './storage';

const BASE = import.meta.env.VITE_API_URL || '';

function getHeaders(json = true): HeadersInit {
  const token = storage.getToken();
  const headers: HeadersInit = {};
  if (json) (headers as Record<string, string>)['Content-Type'] = 'application/json';
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail ?? text;
    } catch {}
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { headers: getHeaders() });
    return handleResponse<T>(res);
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },
  /** Загрузка файлов: возвращает { files: [{ url, type, filename }] }.
   * Файлы читаем в Blob перед отправкой — на мобилке FormData с нативным File часто падает. */
  async uploadFiles(files: File[]): Promise<{ files: { url: string; type?: string; filename?: string }[] }> {
    const form = new FormData();
    const safeName = (name: string) => {
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
      const base = name.slice(0, name.lastIndexOf('.') || name.length).replace(/[^\w\s\-\.]/g, '_').slice(0, 80);
      return (base || 'file') + (ext || '');
    };
    for (const f of files) {
      const buffer = await f.arrayBuffer();
      const blob = new Blob([buffer], { type: f.type || 'application/octet-stream' });
      form.append('files', blob, safeName(f.name || 'file'));
    }
    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: getHeaders(false),
      body: form,
      credentials: 'include',
    });
    return handleResponse(res);
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  async delete(path: string): Promise<void> {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse<void>(res);
  },
};
