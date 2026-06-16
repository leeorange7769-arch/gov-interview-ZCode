import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  Mic,
  BarChart3,
  Sparkles,
  ChevronLeft,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { path: '/', label: '首页', icon: Home, end: true },
  { path: '/question-bank', label: '题库中心', icon: BookOpen },
  { path: '/mock-exam', label: '模拟考试', icon: Mic },
  { path: '/exam', label: '考试系统', icon: PenTool },
  { path: '/learning-progress', label: '学习进度', icon: BarChart3 },
  { path: '/ai-analysis', label: 'AI分析', icon: Sparkles },
];

interface MainSidebarProps {
  collapsed: boolean;
  onClose: () => void;
}

export default function MainSidebar({ collapsed, onClose }: MainSidebarProps) {
  const location = useLocation();

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-60 bg-sidebar text-sidebar-foreground z-40',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          'md:translate-x-0 md:static md:z-auto'
        )}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">公</span>
            </div>
            <span className="font-bold text-base text-sidebar-foreground">公考面试通</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="关闭菜单"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.path, item.end);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* 底部信息 */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/50 text-center">
            公考面试通 v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
