import { useState, useEffect } from 'react';
import { Card, Spinner } from '../../components/ui';
import { statsApi, StatsOverview, UserGrowthItem, QuestionPopularityItem } from '../../api/stats';
import { Users, FileText, ClipboardList, TrendingUp } from 'lucide-react';

// 简易 SVG 折线图
function LineChart({ data }: { data: UserGrowthItem[] }) {
  if (!data.length) return <p className="text-gray-400 text-center py-8">暂无数据</p>;

  const w = 600;
  const h = 220;
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = pad.top + chartH - (d.count / maxVal) * chartH;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = pad.top + chartH - r * chartH;
        return (
          <g key={r}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e5e7eb" strokeDasharray="4 3" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
              {Math.round(r * maxVal)}
            </text>
          </g>
        );
      })}
      {/* X labels */}
      {data.map((d, i) => {
        if (data.length <= 12 || i % Math.ceil(data.length / 6) === 0) {
          const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
          return (
            <text key={d.date} x={x} y={h - 8} textAnchor="middle" className="text-[10px] fill-gray-400">
              {d.date.slice(5)}
            </text>
          );
        }
        return null;
      })}
      {/* Line */}
      <polyline points={points.join(' ')} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Area fill */}
      <polygon
        points={`${pad.left},${pad.top + chartH} ${points.join(' ')} ${w - pad.right},${pad.top + chartH}`}
        fill="url(#lineGrad)"
      />
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Dots */}
      {data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = pad.top + chartH - (d.count / maxVal) * chartH;
        return (
          <g key={d.date}>
            <circle cx={x} cy={y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
            <title>{`${d.date}: ${d.count} 人`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// 简易横向条形图
function BarChart({ data }: { data: QuestionPopularityItem[] }) {
  if (!data.length) return <p className="text-gray-400 text-center py-8">暂无数据</p>;

  const maxVal = Math.max(...data.map((d) => d.practiceCount), 1);

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.questionId} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={item.title}>
                {item.title.length > 24 ? item.title.slice(0, 24) + '...' : item.title}
              </span>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{item.practiceCount} 次</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                style={{ width: `${(item.practiceCount / maxVal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [growth, setGrowth] = useState<UserGrowthItem[]>([]);
  const [popularity, setPopularity] = useState<QuestionPopularityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ov, gr, pop] = await Promise.all([
          statsApi.overview(),
          statsApi.userGrowth(12),
          statsApi.questionPopularity(10),
        ]);
        setOverview(ov.data);
        setGrowth(gr.data);
        setPopularity(pop.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const statCards = [
    { label: '总用户数', value: overview?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: '总题目数', value: overview?.totalQuestions ?? 0, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: '总考试次数', value: overview?.totalExams ?? 0, icon: ClipboardList, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    { label: '平均分', value: overview?.avgScore ?? 0, icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold dark:text-gray-100">数据统计看板</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
              <div className="text-xl font-bold dark:text-gray-100">{card.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户增长趋势 */}
        <Card className="p-4">
          <h3 className="text-base font-bold mb-4 dark:text-gray-100">用户增长趋势（近12个月）</h3>
          <LineChart data={growth} />
        </Card>

        {/* 题目热度排行 */}
        <Card className="p-4">
          <h3 className="text-base font-bold mb-4 dark:text-gray-100">题目热度排行 TOP 10</h3>
          <BarChart data={popularity} />
        </Card>
      </div>
    </div>
  );
}
