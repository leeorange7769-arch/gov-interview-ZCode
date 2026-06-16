import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { analyzeAnswer } from '../services/scorer';

const router = Router();

// ---- 辅助 ----

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function upsertProgress(
  userId: string,
  questions: Array<{ category: string }>,
  details: Array<{ score: number; dimensions: any }>
) {
  const catMap = new Map<string, Array<{ score: number; dimensions: any }>>();
  questions.forEach((q, idx) => {
    if (!catMap.has(q.category)) catMap.set(q.category, []);
    catMap.get(q.category)!.push(details[idx]);
  });

  for (const [category, items] of catMap) {
    const newCount = items.length;
    const newAvg = items.reduce((s, d) => s + d.score, 0) / newCount;
    const dimSum = { points: 0, structure: 0, richness: 0, relevance: 0 };
    items.forEach((d) => {
      dimSum.points += d.dimensions.points;
      dimSum.structure += d.dimensions.structure;
      dimSum.richness += d.dimensions.richness;
      dimSum.relevance += d.dimensions.relevance;
    });
    const newDims = {
      points: Math.round(dimSum.points / newCount),
      structure: Math.round(dimSum.structure / newCount),
      richness: Math.round(dimSum.richness / newCount),
      relevance: Math.round(dimSum.relevance / newCount),
    };

    const existing = await prisma.learningProgress.findUnique({
      where: { userId_category: { userId, category } },
    });

    if (existing) {
      const total = existing.totalPractices + newCount;
      const oldW = existing.totalPractices / total;
      const newW = newCount / total;
      let oldD: any = {};
      try { oldD = JSON.parse(existing.dimensions); } catch {}

      await prisma.learningProgress.update({
        where: { userId_category: { userId, category } },
        data: {
          totalPractices: total,
          avgScore: Math.round((existing.avgScore * oldW + newAvg * newW) * 10) / 10,
          dimensions: JSON.stringify({
            points: Math.round((oldD.points || 0) * oldW + newDims.points * newW),
            structure: Math.round((oldD.structure || 0) * oldW + newDims.structure * newW),
            richness: Math.round((oldD.richness || 0) * oldW + newDims.richness * newW),
            relevance: Math.round((oldD.relevance || 0) * oldW + newDims.relevance * newW),
          }),
          lastPracticedAt: new Date(),
        },
      });
    } else {
      await prisma.learningProgress.create({
        data: {
          userId,
          category,
          totalPractices: newCount,
          avgScore: Math.round(newAvg * 10) / 10,
          dimensions: JSON.stringify(newDims),
          lastPracticedAt: new Date(),
        },
      });
    }
  }
}

// ============================================================
// 题本管理
// ============================================================

/**
 * GET /api/exams/sets
 * 获取所有题本列表
 */
router.get('/sets', async (_req: Request, res: Response, next) => {
  try {
    const sets = await prisma.questionSet.findMany({
      include: {
        items: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 解析每道题的 tags
    const data = sets.map((set) => ({
      ...set,
      items: set.items.map((item) => ({
        ...item,
        question: { ...item.question, tags: parseTags(item.question.tags) },
      })),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/exams/sets/:id
 * 获取单个题本详情
 */
router.get('/sets/:id', async (req: Request, res: Response, next) => {
  try {
    const set = await prisma.questionSet.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!set) throw new AppError('题本不存在', 404);

    res.json({
      data: {
        ...set,
        items: set.items.map((item) => ({
          ...item,
          question: { ...item.question, tags: parseTags(item.question.tags) },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/exams/sets
 * [管理员] 创建题本
 */
router.post('/sets', authenticate, requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { title, timeLimit, questionIds } = req.body;

    if (!title || !timeLimit || !questionIds?.length) {
      throw new AppError('标题、时长和题目列表为必填项', 400);
    }

    const set = await prisma.questionSet.create({
      data: {
        title,
        timeLimit,
        items: {
          create: questionIds.map((qId: string, idx: number) => ({
            questionId: qId,
            sortOrder: idx,
          })),
        },
      },
      include: {
        items: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.status(201).json({
      data: {
        ...set,
        items: set.items.map((item) => ({
          ...item,
          question: { ...item.question, tags: parseTags(item.question.tags) },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 考试记录 CRUD
// ============================================================

/**
 * POST /api/exams/records
 * [登录] 提交模拟考试记录（前端已评分的直通模式）
 */
router.post('/records', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { questionSetId, score, totalQuestions, timeSpent, timeUp, answers, details } = req.body;

    if (!questionSetId || score === undefined) {
      throw new AppError('题本ID和分数为必填项', 400);
    }

    const record = await prisma.examRecord.create({
      data: {
        userId: req.user!.userId,
        questionSetId,
        score,
        totalQuestions: totalQuestions || 0,
        timeSpent: timeSpent || null,
        timeUp: timeUp || false,
        answers: JSON.stringify(answers || []),
        details: JSON.stringify(details || []),
      },
    });

    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/exams/records
 * [登录] 获取当前用户的考试记录
 */
router.get('/records', authenticate, async (req: Request, res: Response, next) => {
  try {
    const records = await prisma.examRecord.findMany({
      where: { userId: req.user!.userId },
      include: { questionSet: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: records });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/exams/records/:id
 * [登录] 获取单条考试记录详情
 */
router.get('/records/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const record = await prisma.examRecord.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!record) throw new AppError('记录不存在', 404);
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 模拟考试 — 随机组卷与交卷评分（服务器端评分）
// ============================================================

/**
 * POST /api/exams/start
 * 开始模拟考试 — 随机组卷（默认3题）
 * Body: { questionCount?: number, categories?: string[] }
 */
router.post('/start', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { questionCount = 3, categories } = req.body;
    const count = Math.min(Math.max(1, questionCount), 20);

    const where: any = {};
    if (categories && Array.isArray(categories) && categories.length > 0) {
      where.category = { in: categories };
    }

    const allQuestions = await prisma.question.findMany({ where });

    if (allQuestions.length === 0) {
      throw new AppError('题库中没有符合条件的题目', 400);
    }

    const selected = shuffleArray(allQuestions).slice(0, Math.min(count, allQuestions.length));
    const timeLimit = selected.length * 5; // 每题5分钟

    // 创建题本
    const questionSet = await prisma.questionSet.create({
      data: {
        title: `模拟考试 ${new Date().toLocaleDateString('zh-CN')}`,
        timeLimit,
      },
    });

    await prisma.questionSetItem.createMany({
      data: selected.map((q, idx) => ({
        questionSetId: questionSet.id,
        questionId: q.id,
        sortOrder: idx + 1,
      })),
    });

    res.json({
      id: questionSet.id,
      title: questionSet.title,
      timeLimit: questionSet.timeLimit,
      questionCount: selected.length,
      questions: selected.map((q) => ({ ...q, tags: parseTags(q.tags) })),
      startedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/exams/:id/submit
 * 交卷 — 服务器端评分并保存考试记录
 * :id = questionSetId
 * Body: { answers: [{questionId, answer}], timeSpent?: number, timeUp?: boolean }
 */
router.post('/:id/submit', authenticate, async (req: Request, res: Response, next) => {
  try {
    const questionSetId = req.params.id;
    const userId = req.user!.userId;
    const { answers, timeSpent, timeUp = false } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw new AppError('请提供作答内容', 400);
    }

    const questionSet = await prisma.questionSet.findUnique({
      where: { id: questionSetId },
      include: {
        items: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!questionSet) {
      throw new AppError('题本不存在', 404);
    }

    const questions = questionSet.items.map((item) => item.question);
    const totalQuestions = questions.length;

    const details: Array<{
      questionId: string;
      score: number;
      dimensions: { points: number; structure: number; richness: number; relevance: number };
      matchedTags: string[];
      missedTags: string[];
      comments: string[];
    }> = [];

    let totalScore = 0;

    for (const question of questions) {
      const userAnswer = answers.find((a: any) => a.questionId === question.id);
      const answerText = userAnswer?.answer || '';

      const result = analyzeAnswer(answerText, {
        category: question.category,
        domain: question.domain,
        tags: parseTags(question.tags),
      });

      details.push({
        questionId: question.id,
        score: result.total,
        dimensions: result.dimensions,
        matchedTags: result.matchedTags,
        missedTags: result.missedTags,
        comments: result.comments,
      });

      totalScore += result.total;
    }

    const averageScore = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;

    const examRecord = await prisma.examRecord.create({
      data: {
        userId,
        questionSetId,
        score: averageScore,
        totalQuestions,
        timeSpent: timeSpent || null,
        timeUp,
        answers: JSON.stringify(answers.map((a: any) => ({
          questionId: a.questionId,
          answer: a.answer || '',
        }))),
        details: JSON.stringify(details),
      },
    });

    // 更新各题型的学习进度
    await upsertProgress(userId, questions, details);

    res.json({
      examRecord: {
        id: examRecord.id,
        score: examRecord.score,
        totalQuestions: examRecord.totalQuestions,
        timeUp: examRecord.timeUp,
        timeSpent: examRecord.timeSpent,
        createdAt: examRecord.createdAt,
      },
      averageScore,
      details,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
