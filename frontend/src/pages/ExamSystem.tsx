import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain, Target, FileText, Settings,
  Clock, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck,
  AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button, Card, Badge, ProgressBar, Modal, cn } from '../components/ui';
import { useStore } from '../store';
import QuestionNav from '../components/exam/QuestionNav';
import RadarChart, { type RadarDataItem } from '../components/exam/RadarChart';
import { EXAM_MODES, ALL_QUESTIONS, QUESTION_CATEGORIES, type Question, type ExamMode } from '../data/mock';
import { analyzeAnswer, type ScoreResult } from '../utils/scorer';

// ============================================================
// 6 维能力雷达维度定义
// ============================================================
const RADAR_DIMENSIONS = [
  { key: '综合分析', label: '综合分析' },
  { key: '计划组织', label: '组织管理' },
  { key: '应急应变', label: '应急应变' },
  { key: '人际关系', label: '人际沟通' },
  { key: '自我认知', label: '自我认知' },
  { key: '情景模拟', label: '时政热点' },
] as const;

// ============================================================
// 图标映射
// ============================================================
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Brain, Target, FileText, Settings,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string }> = {
  blue:   { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-600', light: 'bg-blue-50' },
  green:  { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-600', light: 'bg-emerald-50' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-600', light: 'bg-orange-50' },
  purple: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-600', light: 'bg-purple-50' },
};

// ============================================================
// 工具函数：根据模式生成试卷
// ============================================================
function generateExam(mode: ExamMode, config: { count: number; timeLimit: number; categories?: string[] }): { questions: Question[]; timeLimit: number } {
  let pool = [...ALL_QUESTIONS];

  // 专项训练 / 自定义练习：按选定题型筛选
  if ((mode.id === 'specialty' || mode.id === 'custom') && config.categories && config.categories.length > 0) {
    pool = pool.filter(q => config.categories!.includes(q.category));
  }

  // 真题模拟：尽量均衡分布各题型
  if (mode.id === 'real' && config.count > 0) {
    const perCategory = Math.max(1, Math.ceil(config.count / QUESTION_CATEGORIES.length));
    const selected: Question[] = [];
    const used = new Set<string>();
    for (const cat of QUESTION_CATEGORIES) {
      const catPool = pool.filter(q => q.category === cat && !used.has(q.id));
      for (let i = 0; i < Math.min(perCategory, catPool.length); i++) {
        selected.push(catPool[i]);
        used.add(catPool[i].id);
      }
    }
    // 如果不够，从剩余题目中补充
    const remaining = pool.filter(q => !used.has(q.id));
    while (selected.length < config.count && remaining.length > 0) {
      const pick = remaining.shift()!;
      selected.push(pick);
    }
    return { questions: selected.slice(0, config.count), timeLimit: config.timeLimit };
  }

  // 随机打乱并取前 N 题（智能组卷 / 自定义 / 专项训练默认）
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return { questions: shuffled.slice(0, config.count), timeLimit: config.timeLimit };
}

// ============================================================
// 主页面组件
// ============================================================
export default function ExamSystem() {
  const setExamMode = useStore(state => state.setExamMode);
  const addHistory = useStore(state => state.addHistory);

  // --- 阶段管理 ---
  const [stage, setStage] = useState<'mode-selection' | 'config' | 'exam-session' | 'report'>('mode-selection');
  const [selectedMode, setSelectedMode] = useState<ExamMode | null>(null);
  const [examTitle, setExamTitle] = useState('');

  // --- 配置参数 ---
  const [configCount, setConfigCount] = useState(6);
  const [configTime, setConfigTime] = useState(30);
  const [configCategories, setConfigCategories] = useState<string[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // --- 考试状态 ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // --- 报告状态 ---
  const [scoreResults, setScoreResults] = useState<ScoreResult[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<number, boolean>>({});
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  const currentQ = questions[currentIndex];

  // ============================================================
  // 进入考试：隐藏底部导航
  // ============================================================
  useEffect(() => {
    setExamMode(stage === 'exam-session');
    return () => { setExamMode(false); };
  }, [stage, setExamMode]);

  // ============================================================
  // 倒计时
  // ============================================================
  useEffect(() => {
    if (stage !== 'exam-session') return;
    if (timeLeft <= 0) {
      finishExam(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  // ============================================================
  // 选择考试模式 → 打开配置弹窗
  // ============================================================
  const handleSelectMode = (mode: ExamMode) => {
    setSelectedMode(mode);
    setConfigCount(mode.defaultCount);
    setConfigTime(mode.defaultTime);
    setConfigCategories([]);
    setShowConfigModal(true);
  };

  // ============================================================
  // 确认配置，开始考试
  // ============================================================
  const handleStartExam = () => {
    if (!selectedMode) return;
    const { questions: qs, timeLimit } = generateExam(selectedMode, {
      count: configCount,
      timeLimit: configTime,
      categories: configCategories,
    });
    if (qs.length === 0) return;

    const title = `${selectedMode.title} · ${selectedMode.subtitle}`;
    setExamTitle(title);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(''));
    setMarked(new Array(qs.length).fill(false));
    setCurrentIndex(0);
    setTimeLeft(timeLimit * 60);
    setTotalTime(timeLimit * 60);
    setShowConfigModal(false);
    setStage('exam-session');
  };

  // ============================================================
  // 结束考试 → 评分
  // ============================================================
  const finishExam = useCallback((timeUp = false) => {
    const results = questions.map((q, i) => analyzeAnswer(answers[i] || '', q));
    setScoreResults(results);
    setStage('report');

    const avg = Math.round(results.reduce((acc, r) => acc + r.total, 0) / results.length);
    addHistory({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      setId: selectedMode?.id || '',
      type: 'set',
      score: avg,
      feedback: timeUp ? '时间到，已自动提交' : '考试完成',
    });
  }, [questions, answers, selectedMode, addHistory]);

  // ============================================================
  // 导航操作
  // ============================================================
  const goToPrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };
  const goToNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1); };
  const jumpTo = (i: number) => setCurrentIndex(i);
  const toggleMark = () => {
    setMarked(prev => { const next = [...prev]; next[currentIndex] = !next[currentIndex]; return next; });
  };

  const updateAnswer = (text: string) => {
    setAnswers(prev => { const next = [...prev]; next[currentIndex] = text; return next; });
  };

  // ============================================================
  // 交卷确认
  // ============================================================
  const unansweredCount = answers.filter(a => !a.trim()).length;
  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  // ============================================================
  // 报告数据计算
  // ============================================================
  const totalScore = useMemo(() => {
    if (scoreResults.length === 0) return 0;
    return Math.round(scoreResults.reduce((acc, r) => acc + r.total, 0) / scoreResults.length);
  }, [scoreResults]);

  const radarData: RadarDataItem[] = useMemo(() => {
    // 按题型维度聚合得分
    const dimMap: Record<string, { total: number; count: number }> = {};
    for (const dim of RADAR_DIMENSIONS) {
      dimMap[dim.key] = { total: 0, count: 0 };
    }
    questions.forEach((q, i) => {
      if (dimMap[q.category]) {
        dimMap[q.category].total += scoreResults[i]?.total ?? 0;
        dimMap[q.category].count += 1;
      }
    });
    return RADAR_DIMENSIONS.map(dim => ({
      dimension: dim.label,
      score: dimMap[dim.key].count > 0
        ? Math.round(dimMap[dim.key].total / dimMap[dim.key].count)
        : 0,
      fullMark: 100,
    }));
  }, [questions, scoreResults]);

  const passed = totalScore >= 60;

  // 弱项维度分析
  const weakDimensions = radarData
    .filter(d => d.score > 0 && d.score < 60)
    .sort((a, b) => a.score - b.score);

  // ============================================================
  // 返回模式选择
  // ============================================================
  const handleBackToModes = () => {
    setStage('mode-selection');
    setScoreResults([]);
    setQuestions([]);
    setAnswers([]);
    setMarked([]);
  };

  // ============================================================
  // 格式化时间
  // ============================================================
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ============================================================
  // 配置弹窗渲染
  // ============================================================
  const renderConfigModal = () => (
    <Modal open={showConfigModal} onClose={() => setShowConfigModal(false)} title={selectedMode ? `${selectedMode.title} · 考试配置` : '考试配置'}>
      {selectedMode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMode.description}</p>

          {/* 题目数量 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">题目数量</label>
            <div className="flex gap-2 mt-1">
              {[5, 6, 8, 10, 12, 15].map(n => (
                <button
                  key={n}
                  onClick={() => setConfigCount(n)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    configCount === n
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400',
                  )}
                >
                  {n}题
                </button>
              ))}
            </div>
          </div>

          {/* 考试时长 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">考试时长（分钟）</label>
            <div className="flex gap-2 mt-1">
              {[10, 15, 20, 25, 30, 45].map(t => (
                <button
                  key={t}
                  onClick={() => setConfigTime(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    configTime === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400',
                  )}
                >
                  {t}分钟
                </button>
              ))}
            </div>
          </div>

          {/* 专项训练：题型选择 */}
          {selectedMode.id === 'specialty' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">选择题型（可多选，不选则全部）</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {QUESTION_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setConfigCategories(prev =>
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      configCategories.includes(cat)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-emerald-400',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 自定义练习：也支持题型选择 */}
          {selectedMode.id === 'custom' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">选择题型（可多选，不选则全部）</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {QUESTION_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setConfigCategories(prev =>
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      configCategories.includes(cat)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-purple-400',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 开始按钮 */}
          <Button className="w-full" size="lg" onClick={handleStartExam}>
            开始考试
          </Button>
        </div>
      )}
    </Modal>
  );
  if (stage === 'mode-selection') {
    return (
      <>
        <div className="max-w-4xl mx-auto p-4 py-8 min-h-screen">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">模拟考试</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">选择适合你的考试模式，开始练习吧</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {EXAM_MODES.map(mode => {
              const IconComp = ICON_MAP[mode.icon];
              const color = COLOR_MAP[mode.color];
              return (
                <Card
                  key={mode.id}
                  className="p-5 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => handleSelectMode(mode)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color.light)}>
                      {IconComp && <IconComp className={cn('w-6 h-6', color.text)} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{mode.title}</h3>
                      <p className={cn('text-xs font-medium mt-0.5', color.text)}>{mode.subtitle}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">{mode.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        {renderConfigModal()}
      </>
    );
  }

  // ============================================================
  // RENDER: 考试进行中
  // ============================================================
  if (stage === 'exam-session' && currentQ) {
    const progressPct = totalTime > 0 ? Math.round((1 - timeLeft / totalTime) * 100) : 0;

    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col z-40">
        {/* ---- 顶部栏 ---- */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{examTitle}</h2>
            <p className="text-xs text-gray-400">第 {currentIndex + 1}/{questions.length} 题</p>
          </div>
          <div className={cn(
            'text-2xl font-mono font-bold tabular-nums flex items-center gap-1.5',
            timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-gray-100',
          )}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* 进度条 */}
        <div className="px-4 py-1 flex-shrink-0 bg-white dark:bg-gray-900">
          <ProgressBar value={progressPct} />
        </div>

        {/* ---- 题目区域 ---- */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* 题目卡片 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="primary">{currentQ.category}</Badge>
              <Badge variant="success">{currentQ.domain}</Badge>
              {currentQ.difficulty === 'hard' && <Badge variant="danger">困难</Badge>}
              {currentQ.difficulty === 'medium' && <Badge variant="warning">中等</Badge>}
              {currentQ.difficulty === 'easy' && <Badge variant="success">简单</Badge>}
            </div>
            {currentQ.background && (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-3 italic">
                📋 {currentQ.background}
              </p>
            )}
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
              {currentQ.title}
            </h3>
          </Card>

          {/* 答题文本框 */}
          <Card className="p-4 flex-1 flex flex-col">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              ✍️ 你的回答
            </label>
            <textarea
              className="flex-1 w-full min-h-[200px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              placeholder="在此输入你的答案..."
              value={answers[currentIndex] || ''}
              onChange={e => updateAnswer(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2 text-right">
              {answers[currentIndex]?.length || 0} 字
            </p>
          </Card>
        </div>

        {/* ---- 操作按钮行 ---- */}
        <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={goToPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 上一题
          </Button>
          <Button
            variant={marked[currentIndex] ? 'primary' : 'ghost'}
            size="sm"
            onClick={toggleMark}
          >
            {marked[currentIndex]
              ? <><BookmarkCheck className="w-4 h-4 mr-1" /> 已标记</>
              : <><Bookmark className="w-4 h-4 mr-1" /> 标记</>
            }
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button variant="destructive" size="sm" onClick={handleSubmitClick}>
              交卷
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={goToNext}>
              下一题 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* ---- 题目导航条 ---- */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-2 py-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> 未答
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> 已答
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> 标记
            </span>
          </div>
          <QuestionNav
            total={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            marked={marked}
            onJump={jumpTo}
          />
        </div>

        {/* 交卷确认弹窗 */}
        <Modal open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="确认交卷">
          <div className="space-y-4">
            {unansweredCount > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    还有 {unansweredCount} 道题未作答
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    未作答的题目将记为 0 分，确认要交卷吗？
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                所有题目已作答，确认交卷？
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>继续答题</Button>
              <Button variant="destructive" onClick={() => { setShowSubmitConfirm(false); finishExam(false); }}>确认交卷</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ============================================================
  // RENDER: 成绩报告
  // ============================================================
  if (stage === 'report') {
    return (
      <>
      <div className="max-w-4xl mx-auto p-4 py-8 min-h-screen space-y-6">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">考试成绩单</h1>
          <p className="text-sm text-gray-400 mt-1">{examTitle}</p>
        </div>

        {/* 总分卡片 */}
        <Card className="p-6 text-center">
          <div className={cn(
            'inline-flex items-center justify-center w-24 h-24 rounded-full mb-3',
            passed ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
          )}>
            {passed
              ? <CheckCircle className="w-12 h-12 text-emerald-500" />
              : <XCircle className="w-12 h-12 text-red-500" />
            }
          </div>
          <div className={cn('text-5xl font-extrabold', passed ? 'text-emerald-600' : 'text-red-500')}>
            {totalScore}
          </div>
          <p className="text-sm text-gray-400 mt-1">/ 100 分</p>
          <div className="mt-2">
            <Badge variant={passed ? 'success' : 'danger'}>{passed ? '✅ 通过' : '❌ 未通过'}</Badge>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            共 {questions.length} 题 · 已答 {answers.filter(a => a.trim()).length} 题 · 未答 {answers.filter(a => !a.trim()).length} 题
          </p>
        </Card>

        {/* 雷达图 */}
        <Card className="p-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">📊 能力维度分析</h3>
          <RadarChart data={radarData} />
        </Card>

        {/* 各题得分明细 */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">📝 各题得分明细</h3>
          {scoreResults.map((res, i) => {
            const q = questions[i];
            const isExpanded = expandedAnalysis[i] ?? false;
            return (
              <Card key={q.id} className="p-4">
                {/* 题目标题 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      <Badge variant="primary">{q.category}</Badge>
                      <Badge variant="success">{q.domain}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{q.title}</p>
                  </div>
                  <div className={cn(
                    'text-2xl font-extrabold flex-shrink-0',
                    res.total >= 80 ? 'text-emerald-600' : res.total >= 60 ? 'text-blue-600' : res.total >= 40 ? 'text-amber-600' : 'text-red-500',
                  )}>
                    {res.total}
                  </div>
                </div>

                {/* 得分进度条 */}
                <div className="mt-3">
                  <ProgressBar value={res.total} max={100} showLabel />
                </div>

                {/* 四维得分网格 */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                    <div className="text-xs text-gray-400">要点覆盖</div>
                    <div className="font-bold text-sm">{res.dimensions.points}/40</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                    <div className="text-xs text-gray-400">逻辑结构</div>
                    <div className="font-bold text-sm">{res.dimensions.structure}/20</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                    <div className="text-xs text-gray-400">内容丰富度</div>
                    <div className="font-bold text-sm">{res.dimensions.richness}/20</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                    <div className="text-xs text-gray-400">领域契合度</div>
                    <div className="font-bold text-sm">{res.dimensions.relevance}/20</div>
                  </div>
                </div>

                {/* 命中/遗漏标签 */}
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {res.matchedTags.map(t => (
                    <span key={t} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                      ✓ {t}
                    </span>
                  ))}
                  {res.missedTags.map(t => (
                    <span key={t} className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700">
                      {t}
                    </span>
                  ))}
                </div>

                {/* 评语 */}
                <ul className="text-sm text-gray-600 dark:text-gray-400 mt-3 space-y-1 list-disc pl-5">
                  {res.comments.map((c, ci) => <li key={ci}>{c}</li>)}
                </ul>

                {/* 展开查看解析 */}
                <button
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-3 hover:underline"
                  onClick={() => setExpandedAnalysis(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? '收起解析' : '查看解析'}
                </button>
                {isExpanded && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">参考要点：</span>
                    {q.answer}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* AI 优化建议 */}
        <Card className="p-4">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowAISuggestions(prev => !prev)}
          >
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🤖 AI 优化建议
            </h3>
            {showAISuggestions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showAISuggestions && (
            <div className="mt-4 space-y-4">
              {/* 总体评价 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">📋 总体评价</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {passed
                    ? `本次考试总分 ${totalScore} 分，已达到合格标准。整体表现良好，但仍有提升空间，建议重点关注以下弱项维度。`
                    : `本次考试总分 ${totalScore} 分，暂未达到合格标准。需要加强以下薄弱环节的练习，建议针对弱项维度进行专项突破。`
                  }
                </p>
              </div>

              {/* 弱项分析 */}
              {weakDimensions.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">⚠️ 薄弱环节</p>
                  <ul className="mt-2 space-y-1">
                    {weakDimensions.map(d => (
                      <li key={d.dimension} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">{d.dimension}</span>
                        <span className="text-amber-500">— 得分率 {d.score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 提升建议 */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">💡 提升建议</p>
                <ul className="mt-2 space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <li>1. 针对薄弱题型进行每日 2 题专项训练，重点掌握该题型的答题框架和核心要点。</li>
                  <li>2. 作答时注意结构化表达，使用"首先、其次、最后"等逻辑词，提升逻辑维度得分。</li>
                  <li>3. 丰富作答内容，每题建议 150-250 字，结合具体事例展开论述。</li>
                  <li>4. 多阅读时政热点和政策文件，积累领域关键词，提升领域契合度。</li>
                  <li>5. 每日进行 1 次模拟考试，培养时间管理能力和考场心态。</li>
                </ul>
              </div>

              {/* 推荐练习 */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">📚 推荐下一步</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weakDimensions.slice(0, 2).map(d => (
                    <span key={d.dimension} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded dark:bg-blue-800 dark:text-blue-200">
                      专项训练 · {d.dimension}
                    </span>
                  ))}
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded dark:bg-blue-800 dark:text-blue-200">
                    真题模拟 · 全题型
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 底部操作 */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleBackToModes}>
            <RotateCcw className="w-4 h-4 mr-1" /> 返回首页
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => {
            setShowConfigModal(true);
          }}>
            再来一次
          </Button>
        </div>
      </div>
      {renderConfigModal()}
      </>
    );
  }
}
