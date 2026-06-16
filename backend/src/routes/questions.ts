import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { analyzeAnswer } from '../services/scorer';

// 题型与领域可选值
const QUESTION_CATEGORIES = ['综合分析', '计划组织', '应急应变', '人际关系', '自我认知', '情景模拟'] as const;
const QUESTION_DOMAINS = ['时政热点', '法治政务', '基层治理', '乡村振兴', '民生服务', '作风建设', '团队协作', '人际沟通'] as const;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

const router = Router();

// ---- 辅助：解析 JSON 字符串字段 ----
function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

/**
 * GET /api/questions
 * 获取题库列表（支持按题型/领域/难度筛选 + 关键词搜索，公开只返回上架题目）
 * Query: ?category=&domain=&difficultyLevel=&keyword=&page=1&pageSize=20
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { category, domain, difficultyLevel, keyword, page = '1', pageSize = '20' } = req.query;

    const where: any = {
      status: 'active', // 公开接口只返回上架题目
    };

    if (category && QUESTION_CATEGORIES.includes(category as any)) {
      where.category = category;
    }
    if (domain && QUESTION_DOMAINS.includes(domain as any)) {
      where.domain = domain;
    }
    if (difficultyLevel && DIFFICULTY_LEVELS.includes(difficultyLevel as any)) {
      where.difficultyLevel = difficultyLevel;
    }
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { title: { contains: kw } },
        { answer: { contains: kw } },
        { hint: { contains: kw } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [questions, total] = await Promise.all([
      prisma.question.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.question.count({ where }),
    ]);

    // 解析 tags 字段
    const result = questions.map((q) => ({
      ...q,
      tags: parseTags(q.tags),
    }));

    res.json({ data: result, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/questions/:id
 * 获取单个题目详情
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!question) throw new AppError('题目不存在', 404);

    res.json({ data: { ...question, tags: parseTags(question.tags) } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/questions/categories/list
 * 获取所有题型与领域枚举值
 */
router.get('/categories/list', (_req: Request, res: Response) => {
  res.json({
    categories: [...QUESTION_CATEGORIES],
    domains: [...QUESTION_DOMAINS],
    difficultyLevels: [
      { value: 'easy', label: '简单' },
      { value: 'medium', label: '中等' },
      { value: 'hard', label: '困难' },
    ],
  });
});

/**
 * POST /api/questions/:id/practice
 * [登录] 单题练习提交 — 服务器端评分并保存
 */
router.post('/:id/practice', authenticate, async (req: Request, res: Response, next) => {
  try {
    const questionId = req.params.id;
    const userId = req.user!.userId;
    const { answer } = req.body;

    if (!answer || typeof answer !== 'string') {
      throw new AppError('请提供作答内容', 400);
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      throw new AppError('题目不存在', 404);
    }

    // 服务器端评分
    const questionTags = parseTags(question.tags);
    const result = analyzeAnswer(answer, {
      category: question.category,
      domain: question.domain,
      tags: questionTags,
    });

    // 创建练习记录（JSON 字段转 String）
    const practiceRecord = await prisma.practiceRecord.create({
      data: {
        userId,
        questionId,
        userAnswer: answer,
        score: result.total,
        dimensions: JSON.stringify(result.dimensions),
        matchedTags: JSON.stringify(result.matchedTags),
        missedTags: JSON.stringify(result.missedTags),
        comments: JSON.stringify(result.comments),
      },
    });

    // 更新学习进度
    await upsertProgress(userId, question.category, result.total, result.dimensions);

    res.json({
      practiceRecord: {
        id: practiceRecord.id,
        questionId: practiceRecord.questionId,
        score: practiceRecord.score,
        createdAt: practiceRecord.createdAt,
      },
      scoreResult: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/questions
 * [管理员] 新增题目
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { title, category, domain, tags, answer, hint, difficulty, difficultyLevel, categoryId } = req.body;

    if (!title || !category || !domain || !answer) {
      throw new AppError('标题、题型、领域和参考答案为必填项', 400);
    }

    const question = await prisma.question.create({
      data: {
        title,
        category,
        domain,
        tags: JSON.stringify(tags || []),
        answer,
        hint: hint || null,
        difficulty: difficulty || 1,
        difficultyLevel: difficultyLevel || null,
        categoryId: categoryId || null,
      },
    });

    res.status(201).json({ data: { ...question, tags: parseTags(question.tags) } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/questions/:id
 * [管理员] 编辑题目
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const { title, category, domain, tags, answer, hint, difficulty, difficultyLevel, categoryId, status } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (domain !== undefined) updateData.domain = domain;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (answer !== undefined) updateData.answer = answer;
    if (hint !== undefined) updateData.hint = hint;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (difficultyLevel !== undefined) updateData.difficultyLevel = difficultyLevel;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (status !== undefined) updateData.status = status;

    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ data: { ...question, tags: parseTags(question.tags) } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/questions/:id
 * [管理员] 删除题目
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next) => {
  try {
    await prisma.question.update({
      where: { id: req.params.id },
      data: { status: 'inactive' },
    });
    res.json({ message: '题目已下架（软删除）' });
  } catch (err) {
    next(err);
  }
});

// ---- 辅助 ----

async function upsertProgress(
  userId: string,
  category: string,
  score: number,
  dimensions: { points: number; structure: number; richness: number; relevance: number }
) {
  const existing = await prisma.learningProgress.findUnique({
    where: { userId_category: { userId, category } },
  });

  if (existing) {
    const newTotal = existing.totalPractices + 1;
    const oldW = existing.totalPractices / newTotal;
    const newW = 1 / newTotal;
    let oldD: any = {};
    try { oldD = JSON.parse(existing.dimensions); } catch {}

    await prisma.learningProgress.update({
      where: { userId_category: { userId, category } },
      data: {
        totalPractices: newTotal,
        avgScore: Math.round((existing.avgScore * oldW + score * newW) * 10) / 10,
        dimensions: JSON.stringify({
          points: Math.round((oldD.points || 0) * oldW + dimensions.points * newW),
          structure: Math.round((oldD.structure || 0) * oldW + dimensions.structure * newW),
          richness: Math.round((oldD.richness || 0) * oldW + dimensions.richness * newW),
          relevance: Math.round((oldD.relevance || 0) * oldW + dimensions.relevance * newW),
        }),
        lastPracticedAt: new Date(),
      },
    });
  } else {
    await prisma.learningProgress.create({
      data: {
        userId,
        category,
        totalPractices: 1,
        avgScore: score,
        dimensions: JSON.stringify(dimensions),
        lastPracticedAt: new Date(),
      },
    });
  }
}

export default router;
