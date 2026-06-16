import { get, put } from './client';

export interface UserItem {
  id: string; email: string; name: string;
  role: 'ADMIN' | 'USER'; avatar?: string;
  createdAt: string; updatedAt: string;
}

export const userApi = {
  list: (params?: { keyword?: string; page?: number; pageSize?: number }) => {
    const s = new URLSearchParams();
    if (params?.keyword) s.set('keyword', params.keyword);
    if (params?.page) s.set('page', String(params.page));
    if (params?.pageSize) s.set('pageSize', String(params.pageSize));
    return get<{ data: UserItem[]; total: number; page: number; pageSize: number }>(`/admin/users${s.toString() ? '?' + s.toString() : ''}`);
  },
  updateRole: (id: string, role: 'ADMIN' | 'USER') => put<{ data: UserItem }>(`/admin/users/${id}/role`, { role }),
};
