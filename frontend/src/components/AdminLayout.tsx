import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useStore } from '../store';
import Sidebar from './Sidebar';
import TopBar from './layout/TopBar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 管理端侧边栏 */}
      <Sidebar collapsed={!sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 共享顶部栏 */}
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
