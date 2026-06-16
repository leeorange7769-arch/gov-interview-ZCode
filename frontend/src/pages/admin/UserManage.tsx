import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Badge, Spinner } from '../../components/ui';
import { userApi, UserItem } from '../../api/users';
import { Search, Shield, User, ChevronLeft, ChevronRight } from 'lucide-react';

export default function UserManage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.list({
        keyword: keyword || undefined,
        page,
        pageSize,
      });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleRole = async (user: UserItem) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await userApi.updateRole(user.id, newRole);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold dark:text-gray-100">用户管理</h2>

      {/* 搜索 */}
      <Card className="p-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="搜索用户姓名或邮箱..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          />
        </div>
      </Card>

      {/* 表格 */}
      <Card className="p-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">暂无用户数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">用户</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">邮箱</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">角色</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                  注册时间
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300 w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium dark:text-gray-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.role === 'ADMIN' ? 'danger' : 'success'}>
                      {u.role === 'ADMIN' ? (
                        <><Shield className="w-3 h-3 mr-1 inline" /> 管理员</>
                      ) : (
                        <><User className="w-3 h-3 mr-1 inline" /> 普通用户</>
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 hidden lg:table-cell text-xs">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="xs"
                      variant={u.role === 'ADMIN' ? 'secondary' : 'primary'}
                      onClick={() => toggleRole(u)}
                    >
                      {u.role === 'ADMIN' ? '降级' : '升级为管理员'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {total} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
