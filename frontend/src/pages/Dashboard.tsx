import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { Card, Spinner, Badge, cn } from '../components/ui';
import { useStore } from '../store';
import { api } from '../utils/api';
import {
  BookOpen, Trophy, Target, Flame, TrendingUp, Clock, AlertCircle, RefreshCw,
} from 'lucide-react';

// ---------- 类型 ----------

interface DashboardData {
  user: { id: string; name: string; email: string; avatar?: string | null };
  stats: { totalPractices: number; totalExams: number; avgScore: number; consecutiveDays: number };
  trend: { date: string; score: number; count: number }[];
  abilities: { category: string; score: number; fullMark: number; count: number }[];
  recentRecords: { id: string; type: string; title: string; score: number; createdAt: string }[];
}

// ---------- 工具函数 ----------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，注意休息';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了，注意休息';
}

function getEncouragement(): string {
  const list = [
    '坚持就是胜利，今天的努力会成就明天的你！',
    '每一道题都是一次进步，继续加油！',
    '公考之路，贵在坚持，你离成功又近了一步。',
    '日拱一卒，功不唐捐。',
  ];
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- 组件 ----------

export default function Dashboard() {
  const user = useStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getDashboard() as DashboardData;
      setData(result);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8" />
          <span className="text-gray-400 text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-8">
        <Card className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-gray-500">{error || '数据加载失败'}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> 重试
          </button>
        </Card>
      </div>
    );
  }

  const { stats, trend, abilities, recentRecords } = data;
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // ---------- 统计卡片配置 ----------
  const statCards = [
    {
      label: '累计答题',
      value: stats.totalPractices,
      unit: '题',
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: '模拟考试',
      value: stats.totalExams,
      unit: '场',
      icon: Target,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: '平均得分',
      value: stats.avgScore,
      unit: '分',
      icon: Trophy,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: '连续打卡',
      value: stats.consecutiveDays,
      unit: '天',
      icon: Flame,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  // ---------- 雷达图数据 ----------
  const radarData = abilities.map((a) => ({
    category: a.category,
    score: a.score,
    fullMark: a.fullMark,
  }));

  // ---------- 趋势图数据 ----------
  const trendData = trend.map((t) => ({
    date: formatDate(t.date),
    score: t.score,
    count: t.count,
  }));

  return (
    <div className="max-w-4xl mx-auto p-4 py-6 space-y-6">
      {/* ─── 欢迎卡片 ─── */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              👋 {getGreeting()}，{user?.name || data.user.name}！
            </h1>
            <p className="text-blue-100 mt-1 text-sm">{today}</p>
            <p className="text-blue-50 mt-2 text-sm italic">{getEncouragement()}</p>
          </div>
          <div className="hidden sm:block text-6xl opacity-20">📝</div>
        </div>
      </Card>

      {/* ─── 统计概览卡片 ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4 flex flex-col items-center text-center">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mb-2', card.bg)}>
              <card.icon className={cn('w-5 h-5', card.color)} />
            </div>
            <span className="text-xs text-gray-500">{card.label}</span>
            <span className="text-2xl font-bold mt-0.5">
              {card.value}
              <span className="text-sm font-normal text-gray-400 ml-0.5">{card.unit}</span>
            </span>
          </Card>
        ))}
      </div>

      {/* ─── 图表区（两列） ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近7天学习趋势 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">近7天学习趋势</h2>
          </div>
          {trendData.every((t) => t.count === 0) ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <BarChartPlaceholder />
              <p className="text-sm mt-2">暂无数据，快去答题吧！</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'score') return [`${value} 分`, '平均分'];
                    if (name === 'count') return [`${value} 题`, '答题数'];
                    return [value, name] as [string, string];
                  }}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  name="score"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 能力雷达图 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-800">六维能力分析</h2>
          </div>
          {radarData.every((a) => a.score === 0) ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <RadarPlaceholder />
              <p className="text-sm mt-2">开始练习后，能力分析将在这里展示</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: '#4b5563' }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickCount={5}
                />
                <Radar
                  name="能力值"
                  dataKey="score"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
          {/* 图例 */}
          {radarData.some((a) => a.score > 0) && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {abilities.map((a) => (
                <div key={a.category} className="text-center">
                  <div className="text-xs text-gray-500">{a.category}</div>
                  <div className="text-sm font-semibold text-purple-700">{a.score}/{a.fullMark}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── 最近训练记录 ─── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">最近训练记录</h2>
        </div>
        {recentRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">暂无训练记录</p>
            <p className="text-xs mt-1">完成一次练习或模拟考试后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={record.type === 'exam' ? 'warning' : 'primary'}>
                    {record.type === 'exam' ? '模拟考试' : '单题练习'}
                  </Badge>
                  <span className="text-sm text-gray-700 truncate">{record.title}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {formatDateTime(record.createdAt)}
                  </span>
                  <span className={cn(
                    'text-lg font-bold',
                    record.score >= 80 ? 'text-emerald-600' :
                    record.score >= 60 ? 'text-amber-600' : 'text-red-500',
                  )}>
                    {record.score}<span className="text-sm font-normal text-gray-400">分</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- 占位图标 ----------

function BarChartPlaceholder() {
  return (
    <svg className="w-16 h-16 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="14" width="3" height="7" rx="0.5" />
      <rect x="8" y="10" width="3" height="11" rx="0.5" />
      <rect x="13" y="6" width="3" height="15" rx="0.5" />
      <rect x="18" y="2" width="3" height="19" rx="0.5" />
    </svg>
  );
}

function RadarPlaceholder() {
  return (
    <svg className="w-16 h-16 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 22,9 18,21 6,21 2,9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}
