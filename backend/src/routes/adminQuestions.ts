import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有管理端路由都要求登录 + 管理员权限
router.use(authenticate, requireAdmin);

// 题型与领域可选值
const QUESTION_CATEGORIES = ['综合分析', '计划组织', '应急应变', '人际关系', '自我认知', '情景模拟'] as const;
const QUESTION_DOMAINS = ['时政热点', '法治政务', '基层治理', '乡村振兴', '民生服务', '作风建设', '团队协作', '人际沟通'] as const;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

// ---- 辅助：解析 JSON 字符串字段 ----
function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

/**
 * GET /api/admin/questions
 * 管理员获取题库列表（可查看所有状态，包括已下架题目）
 * Query: ?category=&domain=&difficultyLevel=&keyword=&status=&page=1&pageSize=20
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { category, domain, difficultyLevel, keyword, status, page = '1', pageSize = '20' } = req.query;

    const where: any = {};

    if (category && QUESTION_CATEGORIES.includes(category as any)) {
      where.category = category;
    }
    if (domain && QUESTION_DOMAINS.includes(domain as any)) {
      where.domain = domain;
    }
    if (difficultyLevel && DIFFICULTY_LEVELS.includes(difficultyLevel as any)) {
      where.difficultyLevel = difficultyLevel;
    }
    if (status && ['active', 'inactive'].includes(status as string)) {
      where.status = status;
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
      prisma.question.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.question.count({ where }),
    ]);

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
 * POST /api/admin/questions
 * [管理员] 新增题目
 * Body: { title, category, domain, tags?, answer, hint?, difficulty?, difficultyLevel?, categoryId?, status? }
 */
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { title, category, domain, tags, answer, hint, difficulty, difficultyLevel, categoryId, status } = req.body;

    if (!title || !category || !domain || !answer) {
      throw new AppError('标题、题型、领域和参考答案为必填项', 400);
    }

    // 如果提供了 categoryId，验证分类存在
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) throw new AppError('所选细分类别不存在', 400);
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
        status: status || 'active',
      },
    });

    res.status(201).json({ data: { ...question, tags: parseTags(question.tags) } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/questions/:id
 * [管理员] 编辑题目
 * Body: 部分或全部字段
 */
router.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id;
    const { title, category, domain, tags, answer, hint, difficulty, difficultyLevel, categoryId, status } = req.body;

    // 确认题目存在
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw new AppError('题目不存在', 404);

    // 如果提供了 categoryId，验证分类存在
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) throw new AppError('所选细分类别不存在', 400);
    }

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
      where: { id },
      data: updateData,
    });

    res.json({ data: { ...question, tags: parseTags(question.tags) } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/questions/:id
 * [管理员] 删除题目（软删除，设为 inactive）
 */
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw new AppError('题目不存在', 404);

    // 软删除：设为 inactive
    await prisma.question.update({
      where: { id },
      data: { status: 'inactive' },
    });

    res.json({ message: '题目已下架（软删除）' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/questions/batch-delete
 * [管理员] 批量删除题目
 */
router.post('/batch-delete', async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('请提供要删除的题目ID列表', 400);
    }

    // 软删除：批量设为 inactive
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: 'inactive' },
    });

    res.json({ success: true, deletedCount: ids.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/questions/batch-import
 * [管理员] 批量导入题目（预留接口）
 * Body: { questions: [{ title, category, domain, answer, ... }] }
 */
router.post('/batch-import', async (req: Request, res: Response, next) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new AppError('请提供题目数组（questions），且至少包含一道题目', 400);
    }

    // 预留接口：当前返回确认信息，后续可替换为实际批量导入逻辑
    res.json({
      message: `已接收 ${questions.length} 道题目。批量导入功能即将上线，当前为预留接口。`,
      received: questions.length,
      preview: questions.slice(0, 3), // 返回前3道题目作为预览
    });
  } catch (err) {
    next(err);
  }
});

export default router;
