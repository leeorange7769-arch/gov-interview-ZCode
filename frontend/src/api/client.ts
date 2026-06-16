const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('interview-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch { return null; }
}

export class ApiError extends Error {
  status: number; data: any;
  constructor(message: string, status: number, data?: any) {
    super(message); this.status = status; this.data = data;
  }
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  if (!res.ok) {
    const body = isJson ? await res.json() : await res.text();
    const msg = typeof body === 'object' && body?.error ? body.error : typeof body === 'string' ? body : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (isJson ? res.json() : res.text()) as T;
}

export function get<T = any>(endpoint: string): Promise<T> { return request<T>(endpoint, { method: 'GET' }); }
export function post<T = any>(endpoint: string, body?: any): Promise<T> { return request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); }
export function put<T = any>(endpoint: string, body?: any): Promise<T> { return request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }); }
export function del<T = any>(endpoint: string): Promise<T> { return request<T>(endpoint, { method: 'DELETE' }); }
