import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { documentProcessorService, DocumentProcessorService } from '../services/DocumentProcessorService';
import { embeddingService } from '../services/EmbeddingService';

const router = Router();

// ─── Multer 配置（内存存储，最大 20MB） ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/x-markdown',
    ];
    const allowedExts = ['.pdf', '.txt', '.md', '.markdown'];
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式。支持: PDF, TXT, Markdown'));
    }
  },
});

// ─── 所有路由需要管理员权限 ─────────────────────────────
router.use(authenticate, requireAdmin);

/**
 * POST /api/admin/knowledgebases
 * 创建知识库（笔记本）
 */
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('知识库名称不能为空', 400);
    }

    const kb = await prisma.knowledgeBase.create({
      data: {
        name: name.trim(),
        description: description || null,
        createdBy: req.user!.userId,
      },
    });

    res.status(201).json({ data: kb, message: '知识库创建成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/knowledgebases
 * 获取所有知识库列表
 */
router.get('/', async (_req: Request, res: Response, next) => {
  try {
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      include: {
        _count: { select: { documents: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ data: knowledgeBases });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/knowledgebases/:id
 * 获取知识库详情（含文档列表）
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            chunkIndex: true,
            content: true,
            createdAt: true,
          },
          orderBy: [{ fileName: 'asc' }, { chunkIndex: 'asc' }],
        },
      },
    });

    if (!kb) {
      throw new AppError('知识库不存在', 404);
    }

    res.json({ data: kb });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/knowledgebases/:id
 * 删除知识库及其所有文档（级联删除）
 */
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: req.params.id },
    });

    if (!kb) {
      throw new AppError('知识库不存在', 404);
    }

    // 级联删除（Prisma schema 已设置 onDelete: Cascade）
    await prisma.knowledgeBase.delete({
      where: { id: req.params.id },
    });

    res.json({ message: '知识库已删除' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/knowledgebases/:id/upload
 * 上传文档到知识库
 *
 * 处理流程：
 * 1. 接收文件 → 2. 提取文本 → 3. 文本分块 → 4. 生成向量 → 5. 存储
 */
router.post(
  '/:id/upload',
  upload.single('file'),
  async (req: Request, res: Response, next) => {
    try {
      // 验证知识库存在
      const kb = await prisma.knowledgeBase.findUnique({
        where: { id: req.params.id },
      });

      if (!kb) {
        throw new AppError('知识库不存在', 404);
      }

      // 验证文件存在
      if (!req.file) {
        throw new AppError('请上传文件', 400);
      }

      const file = req.file;
      console.log(
        `[upload] 接收文件: ${file.originalname}, 大小: ${(file.size / 1024).toFixed(1)}KB, 类型: ${file.mimetype}`
      );

      // 步骤 1-2: 提取文本并分块
      const chunks = await documentProcessorService.processUpload(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      console.log(`[upload] 文本分块完成: ${chunks.length} 个块`);

      if (chunks.length === 0) {
        throw new AppError('未能从文件中提取到有效文本', 400);
      }

      // 步骤 3: 批量生成向量
      const chunkTexts = chunks.map((c) => c.content);
      const embeddings = await embeddingService.embedBatch(chunkTexts);

      console.log(`[upload] 向量生成完成: ${embeddings.length} 个向量`);

      // 步骤 4: 存储到数据库（使用事务批量插入）
      const fileType =
        DocumentProcessorService.inferFileType(file.originalname);

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < chunks.length; i++) {
          const vectorStr = `[${embeddings[i].join(',')}]`;
          await tx.$executeRawUnsafe(
            `INSERT INTO documents (id, "knowledgeBaseId", "fileName", "fileType", "chunkIndex", content, embedding, metadata, "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, NOW())`,
            crypto.randomUUID(),
            req.params.id,
            file.originalname,
            fileType,
            chunks[i].metadata.chunkIndex,
            chunks[i].content,
            vectorStr,
            JSON.stringify(chunks[i].metadata)
          );
        }
      });

      console.log(`[upload] 存储完成: ${chunks.length} 条文档记录`);

      res.status(201).json({
        data: {
          fileName: file.originalname,
          fileType,
          chunksStored: chunks.length,
          knowledgeBaseId: req.params.id,
          knowledgeBaseName: kb.name,
        },
        message: `文件 "${file.originalname}" 上传成功，已存储 ${chunks.length} 个文本片段`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
