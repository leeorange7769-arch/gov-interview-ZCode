import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  Bookmark,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { Button, Card, Badge, DifficultyDots, cn } from '../components/ui';
import { useStore } from '../store';
import { useSpeech } from '../hooks/useSpeech';
import { useDictation } from '../hooks/useDictation';
import { api } from '../utils/api';
import { DIFFICULTY_LABELS } from '../data/mock';
import type { ScoreResult } from '../utils/scorer';
import type { Difficulty } from '../data/mock';

function mapDifficulty(d: any): Difficulty {
  if (d === 'easy' || d === 'medium' || d === 'hard') return d as Difficulty;
  const num = typeof d === 'number' ? d : parseInt(d) || 1;
  if (num <= 2) return 'easy';
  if (num <= 4) return 'medium';
  return 'hard';
}

export default function QuestionDetail() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const store = useStore();

  // 从 API 加载题目
  const [question, setQuestion] = useState<any>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      setLoadingQuestion(true);
      try {
        const res = await api.getQuestion(questionId!);
        const q = res.data;
        setQuestion({
          ...q,
          tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []),
          difficulty: mapDifficulty(q.difficulty),
        });
      } catch {
        setQuestion(null);
      } finally {
        setLoadingQuestion(false);
      }
    };
    if (questionId) fetchQuestion();
  }, [questionId]);

  if (loadingQuestion) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center pt-20">
        <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
        <p className="text-gray-500">加载题目中...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center pt-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">题目不存在</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/bank')}>
          返回题库
        </Button>
      </div>
    );
  }

  // 本地状态
  const [answer, setAnswer] = useState(store.getDraft(question.id));
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [submitted, setSubmitted] = useState(store.getSubmissions(question.id).length > 0);
  const [showHistory, setShowHistory] = useState(false);
  const [noteText, setNoteText] = useState(store.getNote(question.id));
  const [showNotes, setShowNotes] = useState(false);

  // 收藏状态
  const isFav = store.isFavorite(question.id);

  // 语音 hooks
  const { speak, stop, isSpeaking } = useSpeech();
  const { isListening, toggleListen } = useDictation((text) => {
    setAnswer((prev) => prev + text);
  });

  // 提交历史
  const submissions = store.getSubmissions(question.id);
  const latestSubmission = submissions[0];

  // 字数统计
  const charCount = answer.length;

  // 保存草稿
  const handleSaveDraft = () => {
    store.saveDraft(question.id, answer);
    const btn = document.getElementById('save-btn');
    if (btn) {
      btn.textContent = '已保存 ✓';
      setTimeout(() => {
        if (btn) btn.textContent = '保存草稿';
      }, 1500);
    }
  };

  // 提交评分（调用服务器端 API）
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitPractice(question.id, { answer });
      const result: ScoreResult = res.scoreResult;

      setScoreResult(result);
      setSubmitted(true);

      store.addSubmission(question.id, {
        questionId: question.id,
        date: new Date().toISOString(),
        answer,
        score: result.total,
        dimensions: result.dimensions,
        comments: result.comments,
      });

      store.addHistory({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        setId: question.id,
        type: 'single',
        score: result.total,
        feedback: `完成"${question.title.slice(0, 20)}..."答题`,
      });

      store.saveDraft(question.id, '');
    } catch (err: any) {
      alert(err.message || '提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  // 重新作答
  const handleRetry = () => {
    setAnswer('');
    setScoreResult(null);
    setSubmitted(false);
    store.saveDraft(question.id, '');
  };

  // 保存笔记
  const handleSaveNote = () => {
    store.saveNote(question.id, noteText);
    const el = document.getElementById('note-save-btn');
    if (el) {
      el.textContent = '已保存 ✓';
      setTimeout(() => {
        if (el) el.textContent = '保存';
      }, 1500);
    }
  };

  // 获取历史评分
  const loadHistoryAnswer = (submissionAnswer: string) => {
    setAnswer(submissionAnswer);
    // 历史记录已包含分数，直接展示
    const sub = store.getSubmissions(question.id)[0];
    if (sub) {
      setScoreResult({
        total: sub.score,
        dimensions: sub.dimensions,
        matchedTags: [],
        missedTags: [],
        comments: sub.comments,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 py-6 pb-24 space-y-5">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/bank')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回题库
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.toggleFavorite(question.id)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isFav ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
            )}
            title={isFav ? '取消收藏' : '收藏题目'}
          >
            <Star className={cn('w-5 h-5', isFav && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* 题目内容区 */}
      <Card className="p-6 border-t-4 border-t-blue-600">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant="primary">{question.category}</Badge>
          <Badge variant="default">{question.domain}</Badge>
          <DifficultyDots level={question.difficulty} />
          <span className="text-xs text-gray-400 ml-1">{DIFFICULTY_LABELS[question.difficulty as Difficulty]}</span>
          {submitted && <Badge variant="success">已提交</Badge>}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4 leading-relaxed">{question.title}</h1>

        {question.background && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium mb-1">📋 背景材料</p>
            <p className="text-sm text-amber-700">{question.background}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {question.tags.map((tag: string) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>

        <details className="group">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 transition-colors list-none flex items-center gap-1">
            <ChevronDown className="w-4 h-4 group-open:hidden" />
            <ChevronUp className="w-4 h-4 hidden group-open:block" />
            查看参考要点
          </summary>
          <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed">
            {question.answer}
          </div>
        </details>
      </Card>

      {/* 答题区 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">📝 我的作答</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isSpeaking ? stop() : speak(question.title))}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title={isSpeaking ? '停止朗读' : '朗读题目'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 text-blue-600" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleListen}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isListening ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-100'
              )}
              title={isListening ? '停止语音输入' : '语音输入'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isListening && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            正在聆听... 请口述作答
          </div>
        )}

        <textarea
          className="w-full h-48 p-4 border border-gray-200 rounded-lg resize-y text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors placeholder:text-gray-350"
          placeholder="请在此输入您的作答内容，或点击麦克风按钮进行语音输入..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            字数：<strong className={cn(charCount > 0 ? 'text-blue-600' : 'text-gray-400')}>{charCount}</strong>
            {charCount < 50 && charCount > 0 && (
              <span className="text-amber-500 ml-2">建议至少 100 字以获得更准确的评分</span>
            )}
          </span>
          <span>{Math.ceil(charCount / 200)} 分钟阅读时间</span>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button
            id="save-btn"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={!answer.trim()}
          >
            <Save className="w-4 h-4 mr-1.5" />
            保存草稿
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!answer.trim() || submitted || submitting}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {submitting ? '提交中...' : submitted ? '已提交' : '提交评分'}
          </Button>

          {submitted && (
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              重新作答
            </Button>
          )}
        </div>
      </Card>

      {/* AI 评分结果 */}
      {scoreResult && (
        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              AI 智能评分
            </h2>
            <span className="text-3xl font-bold text-blue-600">
              {scoreResult.total}
              <span className="text-sm text-gray-400 font-normal"> / 100</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: '要点覆盖', score: scoreResult.dimensions.points, max: 40, hint: '核心考点命中' },
              { label: '逻辑结构', score: scoreResult.dimensions.structure, max: 20, hint: '作答框架完整' },
              { label: '内容丰富度', score: scoreResult.dimensions.richness, max: 20, hint: '论述展开充分' },
              { label: '领域契合度', score: scoreResult.dimensions.relevance, max: 20, hint: '政策素养体现' },
            ].map((dim) => (
              <div key={dim.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{dim.label}</div>
                <div className="text-xl font-bold text-gray-800">
                  {dim.score}
                  <span className="text-xs text-gray-400 font-normal">/{dim.max}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{dim.hint}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 font-medium mb-2">核心考点覆盖情况：</p>
            <div className="flex flex-wrap gap-1.5">
              {scoreResult.matchedTags.map((t) => (
                <span key={t} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
                  ✓ {t}
                </span>
              ))}
              {scoreResult.missedTags.map((t) => (
                <span key={t} className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded line-through">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">AI 点评建议：</p>
            {scoreResult.comments.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-blue-400 mt-0.5">▸</span>
                {c}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 历史提交记录 */}
      {submissions.length > 0 && (
        <Card className="p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-gray-400" />
              提交记录（{submissions.length}）
            </h2>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {submissions.map((sub, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => loadHistoryAnswer(sub.answer)}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {new Date(sub.date).toLocaleString('zh-CN')}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                      {sub.answer.slice(0, 50)}...
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{sub.score} 分</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 笔记区 */}
      <Card className="p-6">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            📒 我的笔记{store.getNote(question.id) && ' ·'}
          </h2>
          {showNotes ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showNotes && (
          <div className="mt-4 space-y-3">
            <textarea
              className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-y text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
              placeholder="记录答题心得、思路框架、易忘要点..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button id="note-save-btn" variant="primary" size="sm" onClick={handleSaveNote}>
                保存
              </Button>
              {noteText && (
                <span className="text-xs text-gray-400">笔记字数：{noteText.length}</span>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
