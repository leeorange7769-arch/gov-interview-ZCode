import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  ChevronLeft,
} from 'lucide-react';

const menuItems = [
  { path: '/admin', label: '数据看板', icon: LayoutDashboard, end: true },
  { path: '/admin/questions', label: '题目管理', icon: FileText },
  { path: '/admin/users', label: '用户管理', icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onClose: () => void;
}

export default function Sidebar({ collapsed, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          'md:translate-x-0 md:static md:z-auto'
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">公</span>
            </div>
            <span className="font-bold text-lg dark:text-gray-100">管理后台</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
            公考面试通 v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
