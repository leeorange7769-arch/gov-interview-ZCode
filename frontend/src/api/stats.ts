import { get } from './client';

export interface StatsOverview { totalUsers: number; totalQuestions: number; totalExams: number; avgScore: number; }
export interface UserGrowthItem { date: string; count: number; }
export interface QuestionPopularityItem { questionId: string; title: string; practiceCount: number; category: string; }

export const statsApi = {
  overview: () => get<{ data: StatsOverview }>('/admin/stats/overview'),
  userGrowth: (months?: number) => get<{ data: UserGrowthItem[] }>(`/admin/stats/user-growth${months ? '?months=' + months : ''}`),
  questionPopularity: (limit?: number) => get<{ data: QuestionPopularityItem[] }>(`/admin/stats/question-popularity${limit ? '?limit=' + limit : ''}`),
};
