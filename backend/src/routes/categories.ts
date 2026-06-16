import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/categories/tree
 * 获取题型分类树结构（公开）
 * 返回嵌套的 category 树形数据
 */
router.get('/tree', async (_req: Request, res: Response, next) => {
  try {
    const allCategories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    // 递归构建树形结构
    const buildTree = (parentId: string | null): any[] => {
      return allCategories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          parentId: cat.parentId,
          sortOrder: cat.sortOrder,
          questionCount: cat._count.questions,
          children: buildTree(cat.id),
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        }));
    };

    const tree = buildTree(null);

    res.json({ data: tree });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/categories/flat
 * 获取所有分类（扁平列表，公开）
 */
router.get('/flat', async (_req: Request, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// 以下为管理员分类管理接口（挂载在 /api/admin/categories）
// ═══════════════════════════════════════════════════════

const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

/**
 * GET /api/admin/categories
 * 管理员获取分类列表
 */
adminRouter.get('/', async (_req: Request, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { questions: true, children: true } },
      },
    });

    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/categories
 * 创建新分类
 */
adminRouter.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, parentId, sortOrder } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('分类名称不能为空', 400);
    }

    // 如果指定了父分类，验证其存在
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) throw new AppError('父分类不存在', 400);
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/categories/:id
 * 编辑分类
 */
adminRouter.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id;
    const { name, parentId, sortOrder } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('分类不存在', 404);

    // 不能将分类的父级设为自己
    if (parentId && parentId === id) {
      throw new AppError('不能将分类的父级设为自己', 400);
    }

    // 如果指定了父分类，验证其存在
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) throw new AppError('父分类不存在', 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (parentId !== undefined) updateData.parentId = parentId;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    res.json({ data: category });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * 删除分类（仅当无子分类时允许）
 */
adminRouter.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('分类不存在', 404);

    // 检查是否有子分类
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new AppError('该分类下还有子分类，无法删除', 400);
    }

    // 解除关联的题目
    await prisma.question.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.category.delete({ where: { id } });

    res.json({ message: '分类已删除' });
  } catch (err) {
    next(err);
  }
});

export { router as categoriesPublicRouter, adminRouter as categoriesAdminRouter };
