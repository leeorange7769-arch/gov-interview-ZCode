import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Spinner, Modal, cn } from '../../components/ui';
import { questionApi, QuestionItem } from '../../api/questions';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const QUESTION_CATEGORIES = ['全部', '综合分析', '计划组织', '应急应变', '人际关系', '自我认知', '情景模拟'];

export default function QuestionManage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; target: string | null }>({ open: false, target: null });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await questionApi.adminList({
        category: category === '全部' ? undefined : category,
        keyword: keyword || undefined,
        page,
        pageSize,
      });
      setQuestions(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }, [category, keyword, page, pageSize]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await questionApi.remove(id);
      fetchQuestions();
      setDeleteModal({ open: false, target: null });
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await questionApi.batchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchQuestions();
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  const tagsArr = (tags: string | string[]): string[] => {
    if (Array.isArray(tags)) return tags;
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-gray-100">题目管理</h2>
        <Button onClick={() => navigate('/admin/questions/new')}>
          <Plus className="w-4 h-4 mr-1" /> 新增题目
        </Button>
      </div>

      {/* 工具栏 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索题目..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto flex-wrap">
            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> 批量删除 ({selectedIds.size})
            </Button>
          )}
        </div>
      </Card>

      {/* 表格 */}
      <Card className="p-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            暂无题目数据
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === questions.length && questions.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">标题</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">题型</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">领域</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                  创建时间
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300 w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium dark:text-gray-100 truncate max-w-[240px]">
                      {q.title}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap sm:hidden">
                      <Badge variant="primary">{q.category}</Badge>
                      <span className="text-xs text-gray-400">{q.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="primary">{q.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    {q.domain}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 hidden lg:table-cell text-xs">
                    {q.createdAt ? new Date(q.createdAt).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/admin/questions/${q.id}/edit`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, target: q.id })}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, target: null })}
        title="确认删除"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              确定要删除这道题目吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModal({ open: false, target: null })}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteModal.target && handleDelete(deleteModal.target)}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
