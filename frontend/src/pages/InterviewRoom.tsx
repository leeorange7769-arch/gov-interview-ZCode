import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Volume2, VolumeX, Mic, MicOff, AlertTriangle } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useStore } from '../store';
import { useSpeech } from '../hooks/useSpeech';
import { useDictation } from '../hooks/useDictation';
import { api } from '../utils/api';

export default function InterviewRoom() {
  const navigate = useNavigate();
  const addHistory = useStore((s) => s.addHistory);
  const logout = useStore((s) => s.logout);

  const [step, setStep] = useState<'config' | 'active' | 'result'>('config');
  const [examId, setExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);

  const currentQ = questions[currentQIndex];

  const { speak, stop, isSpeaking } = useSpeech();
  const { isListening, toggleListen } = useDictation((text) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQIndex] = (next[currentQIndex] || '') + text;
      return next;
    });
  });

  // 倒计时 — 时间耗尽自动提交
  useEffect(() => {
    if (step !== 'active') return;
    if (timeLeft <= 0) {
      finishInterview(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const startInterview = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.startExam({ questionCount: 3 });
      setExamId(data.id);
      setExamTitle(data.title);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setTimeLimit(data.timeLimit * 60);
      setTimeLeft(data.timeLimit * 60);
      setCurrentQIndex(0);
      setStartTime(Date.now());
      setStep('active');
    } catch (err: any) {
      setError(err.message || '开始考试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((p) => p + 1);
    } else {
      finishInterview();
    }
  };

  const finishInterview = async (timeUp = false) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setLoading(true);
    try {
      const answerList = questions.map((q, idx) => ({
        questionId: q.id,
        answer: answers[idx] || '',
      }));

      const data = await api.submitExam(examId!, {
        answers: answerList,
        timeSpent,
        timeUp,
      });

      setFinalReport({ average: data.averageScore, details: data.details, timeUp });
      setStep('result');

      addHistory({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        setId: examId!,
        type: 'set',
        score: data.averageScore,
        feedback: timeUp ? '时间到，已自动提交' : '完成模考',
      });
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
      {/* 顶部用户栏 */}
      {step === 'config' && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">公考面试通</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            退出登录
          </button>
        </div>
      )}

      {step === 'config' && (
        <div className="mt-10 space-y-6">
          <h1 className="text-2xl font-bold">模拟考试</h1>
          <Card className="p-4">
            <div className="font-bold">随机组卷模式</div>
            <div className="text-sm text-gray-500 mt-1">
              系统将从题库中随机抽取 3 道题，每题 5 分钟，共 15 分钟
            </div>
          </Card>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          <Button className="w-full" onClick={startInterview} disabled={loading}>
            {loading ? '正在生成试卷...' : '开始模拟面试'}
          </Button>
        </div>
      )}

      {step === 'active' && currentQ && (
        <div className="flex-1 flex flex-col gap-4">
          <Card className="p-4 border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold">
                第 {currentQIndex + 1} / {questions.length} 题
              </span>
              <span
                className={`text-xl font-mono ${
                  timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-primary'
                }`}
              >
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <h2 className="text-lg font-bold">{currentQ.title}</h2>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => (isSpeaking ? stop() : speak(currentQ.title))}>
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 mr-1" />
                ) : (
                  <Volume2 className="w-4 h-4 mr-1" />
                )}{' '}
                读题
              </Button>
              <Button
                size="sm"
                variant={isListening ? 'destructive' : 'secondary'}
                onClick={toggleListen}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 mr-1" />
                ) : (
                  <Mic className="w-4 h-4 mr-1" />
                )}{' '}
                口述答题
              </Button>
            </div>
          </Card>

          <textarea
            className="flex-1 w-full p-4 border rounded-lg resize-none focus:outline-primary"
            placeholder="在此处输入或语音识别答题..."
            value={answers[currentQIndex]}
            onChange={(e) => {
              const next = [...answers];
              next[currentQIndex] = e.target.value;
              setAnswers(next);
            }}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button onClick={handleNext} disabled={loading}>
            {loading
              ? '提交中...'
              : currentQIndex === questions.length - 1
              ? '提交评估'
              : '下一题'}
          </Button>
        </div>
      )}

      {step === 'result' && finalReport && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">评估报告: {finalReport.average} 分</h2>
          {finalReport.timeUp && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4" /> 时间已用完，系统已自动为你提交评估
            </div>
          )}
          {finalReport.details.map((res: any, i: number) => (
            <Card key={i} className="p-4">
              <p className="font-bold">Q{i + 1}：{questions[i]?.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                题型：{questions[i]?.category} · 领域：{questions[i]?.domain}
              </p>

              <div className="flex items-center gap-2 mt-3 mb-2">
                <span className="text-2xl font-bold text-primary">{res.score}</span>
                <span className="text-sm text-gray-400">/ 100 分</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-400">要点覆盖</div>
                  <div className="font-bold">{res.dimensions.points}/40</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-400">逻辑结构</div>
                  <div className="font-bold">{res.dimensions.structure}/20</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-400">内容丰富度</div>
                  <div className="font-bold">{res.dimensions.richness}/20</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-gray-400">领域契合度</div>
                  <div className="font-bold">{res.dimensions.relevance}/20</div>
                </div>
              </div>

              {res.matchedTags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-1">
                  {res.matchedTags.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded"
                    >
                      ✓ {t}
                    </span>
                  ))}
                  {res.missedTags?.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc pl-5">
                {res.comments?.map((c: string, ci: number) => <li key={ci}>{c}</li>)}
              </ul>
            </Card>
          ))}
          <Button onClick={() => setStep('config')}>返回首页</Button>
        </div>
      )}
    </div>
  );
}
