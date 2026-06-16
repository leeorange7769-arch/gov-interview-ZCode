// ============================================================
// API 客户端 — 封装 fetch，自动携带 JWT token
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('interview-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || null;
    }
  } catch {}
  return null;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `请求失败: ${res.status}`);
  }

  return data;
}

// ---- 导出方法 ----

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    request<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('POST', '/auth/register', body),

  login: (body: { email: string; password: string }) =>
    request<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('POST', '/auth/login', body),

  getMe: () => request<{ user: any }>('GET', '/auth/me'),

  // Questions
  getQuestions: (params?: { category?: string; domain?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.domain) qs.set('domain', params.domain);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return request<{ data: any[]; total: number }>('GET', `/questions${query ? `?${query}` : ''}`);
  },

  getQuestion: (id: string) =>
    request<{ data: any }>('GET', `/questions/${id}`),

  getCategories: () =>
    request<{ categories: string[]; domains: string[] }>('GET', '/questions/categories/list'),

  // Exams
  startExam: (body?: { questionCount?: number; categories?: string[] }) =>
    request<{
      id: string;
      title: string;
      timeLimit: number;
      questionCount: number;
      questions: any[];
      startedAt: string;
    }>('POST', '/exams/start', body || {}),

  submitExam: (
    examId: string,
    body: { answers: { questionId: string; answer: string }[]; timeSpent?: number; timeUp?: boolean }
  ) =>
    request<{ examRecord: any; averageScore: number; details: any[] }>(
      'POST',
      `/exams/${examId}/submit`,
      body
    ),

  getExamRecords: () =>
    request<{ data: any[] }>('GET', '/exams/records'),

  // Practice
  submitPractice: (questionId: string, body: { answer: string }) =>
    request<{ practiceRecord: any; scoreResult: any }>(
      'POST',
      `/questions/${questionId}/practice`,
      body
    ),

  getPracticeRecords: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return request<{ data: any[]; total: number }>('GET', `/practice/records${query ? `?${query}` : ''}`);
  },

  getProgress: () =>
    request<{ data: any[] }>('GET', '/practice/progress'),

  // Dashboard
  getDashboard: () =>
    request<{
      user: { id: string; name: string; email: string; avatar?: string | null };
      stats: { totalPractices: number; totalExams: number; avgScore: number; consecutiveDays: number };
      trend: { date: string; score: number; count: number }[];
      abilities: { category: string; score: number; fullMark: number; count: number }[];
      recentRecords: { id: string; type: string; title: string; score: number; createdAt: string }[];
    }>('GET', '/user/dashboard'),
};
