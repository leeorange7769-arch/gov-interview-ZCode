import { useState, useEffect } from 'react';
import { Card } from '../components/ui';
import { useStore } from '../store';
import { api } from '../utils/api';
import { Trophy, Clock, BarChart3, Medal, LogOut } from 'lucide-react';

export default function Profile() {
  const history = useStore((s) => s.history);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.getProgress();
        setProgress(res.data || []);
      } catch (err) {
        console.error('加载进度失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const totalPractices = progress.reduce((sum, p) => sum + p.totalPractices, 0);
  const avgScore =
    totalPractices > 0
      ? Math.round(
          progress.reduce((sum, p) => sum + p.avgScore * p.totalPractices, 0) / totalPractices
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 py-8 space-y-6">
      {/* 用户信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user?.name || '用户'}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-red-500 hover:underline"
        >
          <LogOut className="w-4 h-4" /> 退出
        </button>
      </div>

      {/* 数据仪表盘 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center p-4">
          <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
          <span className="text-sm text-gray-500">平均分</span>
          <span className="text-2xl font-bold">{avgScore}</span>
        </Card>
        <Card className="flex flex-col items-center p-4">
          <Clock className="w-6 h-6 text-blue-500 mb-2" />
          <span className="text-sm text-gray-500">总练习</span>
          <span className="text-2xl font-bold">{totalPractices}</span>
        </Card>
        <Card className="flex flex-col items-center p-4">
          <Medal className="w-6 h-6 text-purple-500 mb-2" />
          <span className="text-sm text-gray-500">覆盖题型</span>
          <span className="text-2xl font-bold">{progress.length}/6</span>
        </Card>
      </div>

      {/* 按题型学习进度 */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" /> 分类学习进度
        </h2>
        {loading ? (
          <p className="text-gray-400 text-center py-6">加载中...</p>
        ) : progress.length === 0 ? (
          <p className="text-gray-400 text-center py-10">
            暂无练习记录，去模拟考场刷题吧！
          </p>
        ) : (
          <div className="space-y-3">
            {progress.map((p) => {
              let dims: any = {};
              try {
                dims = typeof p.dimensions === 'string' ? JSON.parse(p.dimensions) : p.dimensions;
              } catch {}
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">{p.category}</span>
                    <span className="text-lg font-bold text-blue-600">{p.avgScore} 分</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                    <span>要点: {dims.points || 0}</span>
                    <span>结构: {dims.structure || 0}</span>
                    <span>内容: {dims.richness || 0}</span>
                    <span>领域: {dims.relevance || 0}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    共 {p.totalPractices} 次练习
                    {p.lastPracticedAt &&
                      ` · 最近: ${new Date(p.lastPracticedAt).toLocaleDateString()}`}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 历史练习记录（来自本地 store） */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" /> 最近练习复盘
        </h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-6">暂无本地记录</p>
          ) : (
            history.slice(0, 10).map((record) => (
              <Card key={record.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800">
                    {record.type === 'set' ? '模拟考试' : '单题练习'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(record.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{record.score} 分</div>
                  <div className="text-xs text-gray-400">{record.feedback}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
