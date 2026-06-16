import { get, post, put, del } from './client';

export interface QuestionItem {
  id: string; title: string; category: string; domain: string;
  tags: string | string[]; answer: string; hint?: string;
  difficultyLevel?: string; difficulty?: number;
  createdAt: string; updatedAt: string;
}

export const questionApi = {
  list: (params?: { category?: string; domain?: string; keyword?: string; page?: number; pageSize?: number }) => {
    const s = new URLSearchParams();
    if (params?.category) s.set('category', params.category);
    if (params?.domain) s.set('domain', params.domain);
    if (params?.keyword) s.set('keyword', params.keyword);
    if (params?.page) s.set('page', String(params.page));
    if (params?.pageSize) s.set('pageSize', String(params.pageSize));
    return get<{ data: QuestionItem[]; total: number; page: number; pageSize: number }>(`/questions${s.toString() ? '?' + s.toString() : ''}`);
  },
  getById: (id: string) => get<{ data: QuestionItem }>(`/questions/${id}`),
  getCategories: () => get<any>('/questions/categories/list'),
  practice: (id: string, answer: string) => post<any>(`/questions/${id}/practice`, { answer }),
  adminList: (params?: any) => {
    const s = new URLSearchParams();
    if (params?.category) s.set('category', params.category);
    if (params?.keyword) s.set('keyword', params.keyword);
    if (params?.page) s.set('page', String(params.page));
    if (params?.pageSize) s.set('pageSize', String(params.pageSize));
    return get<any>(`/admin/questions${s.toString() ? '?' + s.toString() : ''}`);
  },
  create: (data: any) => post<any>('/admin/questions', data),
  update: (id: string, data: any) => put<any>(`/admin/questions/${id}`, data),
  remove: (id: string) => del<any>(`/admin/questions/${id}`),
  batchDelete: (ids: string[]) => post<any>('/admin/questions/batch-delete', { ids }),
};
