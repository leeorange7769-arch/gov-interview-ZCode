import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/practice/records
 * [登录] 提交单题练习记录
 */
router.post('/records', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { questionId, userAnswer, score, dimensions, matchedTags, missedTags, comments } = req.body;

    if (!questionId || score === undefined) {
      throw new AppError('题目ID和分数为必填项', 400);
    }

    const record = await prisma.practiceRecord.create({
      data: {
        userId: req.user!.userId,
        questionId,
        userAnswer: userAnswer || '',
        score,
        dimensions: JSON.stringify(dimensions || {}),
        matchedTags: JSON.stringify(matchedTags || []),
        missedTags: JSON.stringify(missedTags || []),
        comments: JSON.stringify(comments || []),
      },
    });

    // 同步更新 LearningProgress
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (question) {
      const existing = await prisma.learningProgress.findUnique({
        where: { userId_category: { userId: req.user!.userId, category: question.category } },
      });

      if (existing) {
        const newTotal = existing.totalPractices + 1;
        const newAvg = (existing.avgScore * existing.totalPractices + score) / newTotal;
        await prisma.learningProgress.update({
          where: { id: existing.id },
          data: {
            totalPractices: newTotal,
            avgScore: Math.round(newAvg * 10) / 10,
            dimensions: JSON.stringify(dimensions || {}),
            lastPracticedAt: new Date(),
          },
        });
      } else {
        await prisma.learningProgress.create({
          data: {
            userId: req.user!.userId,
            category: question.category,
            totalPractices: 1,
            avgScore: score,
            dimensions: JSON.stringify(dimensions || {}),
            lastPracticedAt: new Date(),
          },
        });
      }
    }

    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/practice/records
 * [登录] 获取当前用户的练习记录
 */
router.get('/records', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { questionId, page = '1', pageSize = '20' } = req.query;

    const where: any = { userId: req.user!.userId };
    if (questionId) where.questionId = questionId;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [records, total] = await Promise.all([
      prisma.practiceRecord.findMany({
        where,
        skip,
        take,
        include: { question: { select: { title: true, category: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.practiceRecord.count({ where }),
    ]);

    res.json({ data: records, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/practice/progress
 * [登录] 获取当前用户的学习进度统计
 */
router.get('/progress', authenticate, async (req: Request, res: Response, next) => {
  try {
    const progress = await prisma.learningProgress.findMany({
      where: { userId: req.user!.userId },
      orderBy: { category: 'asc' },
    });

    // 解析 dimensions JSON 字符串
    const data = progress.map((p) => {
      let dims: any = {};
      try { dims = JSON.parse(p.dimensions); } catch {}
      return { ...p, dimensions: dims };
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
