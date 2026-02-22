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
  /** Загрузка файлов: возвращает { files: [{ url, type, filename }] } */
  async uploadFiles(files: File[]): Promise<{ files: { url: string; type?: string; filename?: string }[] }> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    try {
      const res = await fetch(`${BASE}/api/upload`, {
        method: 'POST',
        headers: getHeaders(false),
        body: form,
        credentials: 'include',
        signal: controller.signal,
      });
      return handleResponse(res);
    } finally {
      clearTimeout(timeoutId);
    }
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
