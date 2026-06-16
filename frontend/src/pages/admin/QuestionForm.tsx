import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Badge, Spinner } from '../../components/ui';
import { questionApi } from '../../api/questions';
import { Save, ArrowLeft, Plus, X, GripVertical } from 'lucide-react';

const QUESTION_CATEGORIES = ['综合分析', '计划组织', '应急应变', '人际关系', '自我认知', '情景模拟'];
const QUESTION_DOMAINS = ['时政热点', '法治政务', '基层治理', '乡村振兴', '民生服务', '作风建设', '团队协作', '人际沟通'];
const DIFFICULTY_LEVELS = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

interface PointItem {
  id: string;
  title: string;
  content: string;
}

let pointIdCounter = 0;
function newPoint(): PointItem {
  return { id: `p_${Date.now()}_${pointIdCounter++}`, title: '', content: '' };
}

export default function QuestionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(QUESTION_CATEGORIES[0]);
  const [domain, setDomain] = useState(QUESTION_DOMAINS[0]);
  const [difficultyLevel, setDifficultyLevel] = useState('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [points, setPoints] = useState<PointItem[]>([newPoint()]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!isEdit);
  const [error, setError] = useState('');

  // 编辑模式：加载题目数据
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await questionApi.getById(id);
        const q = res.data;
        setTitle(q.title);
        setCategory(q.category);
        setDomain(q.domain);
        setDifficultyLevel(q.difficultyLevel || 'medium');
        const parsedTags = typeof q.tags === 'string' ? (() => { try { return JSON.parse(q.tags); } catch { return []; } })() : q.tags;
        setTags(Array.isArray(parsedTags) ? parsedTags : []);
        setAnswer(q.answer || '');
        // 将 hint 解析为分点
        if (q.hint) {
          try {
            const parsed = JSON.parse(q.hint);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPoints(parsed.map((p: any) => ({ id: p.id || newPoint().id, title: p.title || '', content: p.content || p.text || '' })));
            } else {
              setPoints([newPoint()]);
            }
          } catch {
            setPoints([newPoint()]);
          }
        }
      } catch (err) {
        console.error('Failed to load question:', err);
        setError('加载题目失败');
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const addPoint = () => {
    setPoints([...points, newPoint()]);
  };

  const removePoint = (pid: string) => {
    if (points.length <= 1) return;
    setPoints(points.filter((p) => p.id !== pid));
  };

  const updatePoint = (pid: string, field: 'title' | 'content', value: string) => {
    setPoints(points.map((p) => (p.id === pid ? { ...p, [field]: value } : p)));
  };

  const movePoint = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= points.length) return;
    const copy = [...points];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setPoints(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = {
      title,
      category,
      domain,
      tags,
      answer,
      difficultyLevel,
      hint: JSON.stringify(points.filter((p) => p.title || p.content)),
    };

    try {
      if (isEdit) {
        await questionApi.update(id!, data);
      } else {
        await questionApi.create(data);
      }
      navigate('/admin/questions');
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/questions')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold dark:text-gray-100">
          {isEdit ? '编辑题目' : '新增题目'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <Card className="p-5 space-y-4">
          <h3 className="font-bold dark:text-gray-100">基本信息</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              题目标题 <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入题目标题"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                题型 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {QUESTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                领域 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {QUESTION_DOMAINS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">难度</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
              >
                {DIFFICULTY_LEVELS.map((dl) => (
                  <option key={dl.value} value={dl.value}>{dl.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签（核心考点）</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
                placeholder="输入标签后按回车添加"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                <Plus className="w-3 h-3 mr-1" /> 添加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 答题思路（分点输入） */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold dark:text-gray-100">答题要点 / 思路</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addPoint}>
              <Plus className="w-3 h-3 mr-1" /> 添加要点
            </Button>
          </div>

          <div className="space-y-3">
            {points.map((point, idx) => (
              <div key={point.id} className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span className="text-xs text-gray-400 font-mono w-5 text-center">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => movePoint(idx, -1)}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`要点 ${idx + 1} 标题`}
                    value={point.title}
                    onChange={(e) => updatePoint(point.id, 'title', e.target.value)}
                  />
                  <textarea
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder={`要点 ${idx + 1} 详细内容`}
                    value={point.content}
                    onChange={(e) => updatePoint(point.id, 'content', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePoint(point.id)}
                  disabled={points.length <= 1}
                  className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 mt-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 参考答案 */}
        <Card className="p-5 space-y-4">
          <h3 className="font-bold dark:text-gray-100">
            参考答案 <span className="text-red-500">*</span>
          </h3>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={8}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="请输入参考答案..."
            required
          />
        </Card>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/questions')}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </div>
  );
}
