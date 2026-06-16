import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要管理员权限
router.use(authenticate, requireAdmin);

// ============================================================
// 用户管理
// ============================================================

/** GET /api/admin/users — 用户列表（分页、搜索） */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, page = '1', pageSize = '20' } = req.query;
    const where: any = {};

    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { name: { contains: kw } },
        { email: { contains: kw } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/users/:id/role — 修改用户角色 */
router.put('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      throw new AppError('角色必须为 ADMIN 或 USER', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('用户不存在', 404);

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 数据统计
// ============================================================

/** GET /api/admin/stats/overview — 总览统计 */
router.get('/stats/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalQuestions, totalExams, avgScoreResult] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.examRecord.count(),
      prisma.examRecord.aggregate({ _avg: { score: true } }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalQuestions,
        totalExams,
        avgScore: Math.round(avgScoreResult._avg.score || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/stats/user-growth — 用户增长趋势（按月累计） */
router.get('/stats/user-growth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 12, 1), 36);
    const users = await prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const data: { date: string; count: number }[] = [];

    // 初始化最近 N 个月，值为 0
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      data.push({ date: key, count: 0 });
    }

    // 累计计数
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = data.find((e) => e.date === key);
      if (entry) entry.count++;
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/stats/question-popularity — 题目热度排行 */
router.get('/stats/question-popularity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const questions = await prisma.question.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        _count: { select: { practiceRecords: true } },
      },
      orderBy: { practiceRecords: { _count: 'desc' } },
      take: limit,
    });

    const data = questions.map((q) => ({
      questionId: q.id,
      title: q.title,
      category: q.category,
      practiceCount: q._count.practiceRecords,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
