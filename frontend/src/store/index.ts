import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// 类型定义
// ============================================================

interface HistoryRecord {
  id: string;
  date: string;
  setId: string;
  type: 'set' | 'single';
  score: number;
  feedback: string;
}

/** 单题提交记录 */
export interface SubmissionRecord {
  questionId: string;
  date: string;
  answer: string;
  score: number;
  dimensions: {
    points: number;
    structure: number;
    richness: number;
    relevance: number;
  };
  comments: string[];
}

/** 用户信息 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  avatar?: string;
}

interface AppStore {
  // --- 历史记录（兼容旧版）---
  history: HistoryRecord[];
  addHistory: (record: HistoryRecord) => void;

  // --- 收藏题目 ID 集合 ---
  favorites: string[];
  toggleFavorite: (questionId: string) => void;
  isFavorite: (questionId: string) => boolean;

  // --- 题目笔记 { questionId: noteText } ---
  notes: Record<string, string>;
  saveNote: (questionId: string, note: string) => void;
  getNote: (questionId: string) => string;

  // --- 草稿答案 { questionId: draftText } ---
  drafts: Record<string, string>;
  saveDraft: (questionId: string, draft: string) => void;
  getDraft: (questionId: string) => string;

  // --- 提交记录 { questionId: SubmissionRecord[] } ---
  submissions: Record<string, SubmissionRecord[]>;
  addSubmission: (questionId: string, record: SubmissionRecord) => void;
  getSubmissions: (questionId: string) => SubmissionRecord[];
  getLatestSubmission: (questionId: string) => SubmissionRecord | undefined;

  // --- 认证状态 ---
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (user: UserInfo, token: string) => void;
  logout: () => void;

  // --- 暗黑模式 ---
  darkMode: boolean;
  toggleDarkMode: () => void;

  // --- 考试模式（沉浸式全屏，隐藏底部导航） ---
  examMode: boolean;
  setExamMode: (v: boolean) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // --- 历史记录 ---
      history: [],
      addHistory: (record) =>
        set((state) => ({ history: [record, ...state.history] })),

      // --- 收藏 ---
      favorites: [],
      toggleFavorite: (questionId) =>
        set((state) => {
          const exists = state.favorites.includes(questionId);
          return {
            favorites: exists
              ? state.favorites.filter((id) => id !== questionId)
              : [...state.favorites, questionId],
          };
        }),
      isFavorite: (questionId) => get().favorites.includes(questionId),

      // --- 笔记 ---
      notes: {},
      saveNote: (questionId, note) =>
        set((state) => ({
          notes: { ...state.notes, [questionId]: note },
        })),
      getNote: (questionId) => get().notes[questionId] || '',

      // --- 草稿 ---
      drafts: {},
      saveDraft: (questionId, draft) =>
        set((state) => ({
          drafts: { ...state.drafts, [questionId]: draft },
        })),
      getDraft: (questionId) => get().drafts[questionId] || '',

      // --- 提交记录 ---
      submissions: {},
      addSubmission: (questionId, record) =>
        set((state) => ({
          submissions: {
            ...state.submissions,
            [questionId]: [
              record,
              ...(state.submissions[questionId] || []),
            ],
          },
        })),
      getSubmissions: (questionId) => get().submissions[questionId] || [],
      getLatestSubmission: (questionId) => {
        const subs = get().submissions[questionId] || [];
        return subs[0];
      },

      // --- 认证状态 ---
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'ADMIN',
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false,
        }),

      // --- 暗黑模式 ---
      darkMode: false,
      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),

      // --- 考试模式 ---
      examMode: false,
      setExamMode: (v) => set({ examMode: v }),
    }),
    { name: 'interview-storage' }
  )
);
