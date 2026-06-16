import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Star, FileText, ChevronRight, BookOpen, ListTree, RefreshCw } from 'lucide-react';
import { Card, Badge, DifficultyDots, Button, cn } from '../components/ui';
import { useStore } from '../store';
import { api } from '../utils/api';
import {
  QUESTION_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
} from '../data/mock';
import type { Difficulty, QuestionCategory } from '../data/mock';

// 整数难度 → 字符串难度映射
function mapDifficulty(d: any): Difficulty {
  if (d === 'easy' || d === 'medium' || d === 'hard') return d as Difficulty;
  const num = typeof d === 'number' ? d : parseInt(d) || 1;
  if (num <= 2) return 'easy';
  if (num <= 4) return 'medium';
  return 'hard';
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const store = useStore();

  // 数据状态
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | '全部'>('全部');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | '全部'>('全部');
  const [searchText, setSearchText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 加载题目
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.getQuestions({ pageSize: 100 });
      const questions = res.data.map((q: any) => ({
        ...q,
        tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []),
        difficulty: mapDifficulty(q.difficulty),
      }));
      setAllQuestions(questions);
    } catch (err) {
      console.error('加载题库失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // 获取每道题的本地状态
  const getQuestionStatus = (qId: string) => {
    const subs = store.getSubmissions(qId);
    if (subs.length > 0) return 'submitted';
    if (store.getDraft(qId)) return 'draft';
    return 'unattempted';
  };

  // 筛选逻辑
  const filteredQuestions = useMemo(() => {
    let result = allQuestions;

    if (selectedCategory !== '全部') {
      result = result.filter((q) => q.category === selectedCategory);
    }

    if (selectedDifficulty !== '全部') {
      result = result.filter((q) => q.difficulty === selectedDifficulty);
    }

    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase();
      result = result.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.domain.toLowerCase().includes(kw) ||
          (q.tags || []).some((t: string) => t.toLowerCase().includes(kw))
      );
    }

    return result;
  }, [allQuestions, selectedCategory, selectedDifficulty, searchText]);

  // 统计每个分类的数量
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 全部: allQuestions.length };
    QUESTION_CATEGORIES.forEach((cat) => {
      counts[cat] = allQuestions.filter((q) => q.category === cat).length;
    });
    return counts;
  }, [allQuestions]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="success">已提交</Badge>;
      case 'draft':
        return <Badge variant="warning">草稿</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 py-6 flex gap-6">
      {/* 左侧边栏：题型分类树 */}
      <aside
        className={cn(
          'flex-shrink-0 transition-all duration-300',
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        )}
      >
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <ListTree className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-800">题型分类</span>
          </div>

          <nav className="py-2">
            <button
              onClick={() => setSelectedCategory('全部')}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left',
                selectedCategory === '全部'
                  ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                全部题目
              </span>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {categoryCounts['全部']}
              </span>
            </button>

            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left',
                  selectedCategory === cat
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-2">
                  <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', selectedCategory === cat && 'rotate-90')} />
                  {cat}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {categoryCounts[cat]}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">题库中心</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedCategory !== '全部' && CATEGORY_DESCRIPTIONS[selectedCategory]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchQuestions}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="刷新题库"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ListTree className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 搜索与筛选栏 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索题目、标签或领域..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 mr-1">难度：</span>
            <button
              onClick={() => setSelectedDifficulty('全部')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                selectedDifficulty === '全部'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              全部
            </button>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedDifficulty(lvl)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                  selectedDifficulty === lvl
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <DifficultyDots level={lvl} />
                {DIFFICULTY_LABELS[lvl]}
              </button>
            ))}
          </div>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="text-center py-16">
            <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">加载题库中...</p>
          </div>
        )}

        {/* 题目卡片网格 */}
        {!loading && filteredQuestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredQuestions.map((q) => {
              const status = getQuestionStatus(q.id);
              const isFav = store.isFavorite(q.id);
              const tags = q.tags || [];
              return (
                <Card
                  key={q.id}
                  className="p-5 cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => navigate(`/bank/${q.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <DifficultyDots level={q.difficulty} />
                    <div className="flex items-center gap-2">
                      {statusBadge(status)}
                      {isFav && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {q.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="primary">{q.category}</Badge>
                    <Badge variant="default">{q.domain}</Badge>
                    {tags.slice(0, 2).map((t: string) => (
                      <Badge key={t} variant="default" className="text-gray-500">
                        {t}
                      </Badge>
                    ))}
                    {tags.length > 2 && (
                      <span className="text-xs text-gray-400 self-center">+{tags.length - 2}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                    <span>
                      {status === 'unattempted' ? '未作答' : status === 'draft' ? '有草稿' : '已提交'}
                    </span>
                    <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      开始答题 <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredQuestions.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">没有找到匹配的题目</p>
            <p className="text-gray-300 text-sm mt-1">试试调整筛选条件或搜索关键词</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSelectedCategory('全部');
                setSelectedDifficulty('全部');
                setSearchText('');
              }}
            >
              清除所有筛选
            </Button>
          </div>
        )}

        {!loading && filteredQuestions.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            共 {filteredQuestions.length} 道题目
            {selectedCategory !== '全部' && ` · ${selectedCategory}`}
            {selectedDifficulty !== '全部' && ` · ${DIFFICULTY_LABELS[selectedDifficulty]}`}
          </p>
        )}
      </main>
    </div>
  );
}
