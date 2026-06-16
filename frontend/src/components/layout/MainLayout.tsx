import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import MainSidebar from './MainSidebar';
import TopBar from './TopBar';
import { useStore } from '@/store';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const examMode = useStore(s => s.examMode);

  // 考试模式：沉浸式全屏，隐藏侧边栏和顶栏
  if (examMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧导航栏 */}
      <MainSidebar
        collapsed={!sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <TopBar
          showMenuButton
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* 页面内容 */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
