import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import MainLayout from '@/components/layout/MainLayout';
import AdminLayout from '@/components/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import InterviewRoom from '@/pages/InterviewRoom';
import ExamSystem from '@/pages/ExamSystem';
import QuestionBank from '@/pages/QuestionBank';
import QuestionDetail from '@/pages/QuestionDetail';
import Profile from '@/pages/Profile';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import LearningProgress from '@/pages/LearningProgress';
import AIAnalysis from '@/pages/AIAnalysis';
import AdminDashboard from '@/pages/admin/Dashboard';
import QuestionManage from '@/pages/admin/QuestionManage';
import QuestionForm from '@/pages/admin/QuestionForm';
import UserManage from '@/pages/admin/UserManage';
import { useStore } from '@/store';

// ---- 暗黑模式同步 ----
function DarkModeSync() {
  const darkMode = useStore((s) => s.darkMode);
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);
  return null;
}

// ---- 路由守卫：需要登录 ----
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ---- 路由守卫：需要管理员 ----
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <DarkModeSync />
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 主布局：需要登录的用户路由 */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="question-bank/:questionId" element={<QuestionDetail />} />
            <Route path="mock-exam" element={<InterviewRoom />} />
            <Route path="exam" element={<ExamSystem />} />
            <Route path="learning-progress" element={<LearningProgress />} />
            <Route path="ai-analysis" element={<AIAnalysis />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 管理端布局：需要管理员权限 */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="questions" element={<QuestionManage />} />
            <Route path="questions/new" element={<QuestionForm />} />
            <Route path="questions/:id/edit" element={<QuestionForm />} />
            <Route path="users" element={<UserManage />} />
          </Route>

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-screen text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <p className="text-4xl font-bold mb-2">404</p>
                  <p>页面不存在</p>
                </div>
              </div>
            }
          />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
}
