import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ragService } from '../services/RAGService';

const router = Router();

// ─── 所有 AI 路由需要登录 ───────────────────────────────
router.use(authenticate);

/**
 * POST /api/ai/score
 * 单题 AI 评分（基于 RAG 检索增强）
 *
 * 输入：用户答案、题目ID
 * 处理流程：
 * 1. 检索相关参考资料（RAG）
 * 2. 构建评分 Prompt
 * 3. 调用 LLM 生成评分
 * 4. 存储分析结果
 * 5. 返回评分、点评、引用来源
 */
router.post('/score', async (req: Request, res: Response, next) => {
  try {
    const { questionId, userAnswer } = req.body;

    if (!questionId || !userAnswer) {
      throw new AppError('题目ID和考生答案为必填项', 400);
    }

    // 1. 获取题目信息
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new AppError('题目不存在', 404);
    }

    // 2. 构建检索查询（结合题目信息 + 考生答案）
    const searchQuery = `${question.category} ${question.domain} ${question.title} ${userAnswer.substring(0, 500)}`;

    // 3. RAG 检索相关参考资料
    const retrievedChunks = await ragService.retrieveSimilar(searchQuery, [], 5);

    console.log(
      `[ai:score] 检索到 ${retrievedChunks.length} 个相关片段`
    );

    // 4. 构建 Prompt 并调用 LLM
    const { systemPrompt, userPrompt } = ragService.buildScoringPrompt(
      {
        title: question.title,
        category: question.category,
        domain: question.domain,
        tags: question.tags,
        answer: question.answer,
      },
      userAnswer,
      retrievedChunks
    );

    const llmResult = await ragService.callLLM(systemPrompt, userPrompt);

    // 5. 构建引用来源
    const citedIndices: number[] = llmResult.citedReferences || [];
    const citations = ragService.buildCitations(retrievedChunks, citedIndices);

    // 6. 组装最终结果
    const result = {
      totalScore: llmResult.totalScore,
      dimensions: llmResult.dimensions,
      overallComment: llmResult.overallComment,
      improvementSuggestions: llmResult.improvementSuggestions || [],
      citations,
    };

    // 7. 存储 AI 分析记录
    await prisma.aIAnalysis.create({
      data: {
        userId: req.user!.userId,
        analysisType: 'PRACTICE',
        analysis: JSON.stringify({
          questionId,
          userAnswer: userAnswer.substring(0, 500),
          ...result,
        }),
        suggestions: JSON.stringify(llmResult.improvementSuggestions || []),
        strengthsWeaknesses: JSON.stringify({
          strengths: [],
          weaknesses: [],
        }),
      },
    });

    res.json({
      data: result,
      message: 'AI 评分完成',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/analysis
 * 薄弱板块分析（基于 RAG 检索增强）
 *
 * 综合分析用户所有练习记录，结合知识库中的评分标准和典型错误案例，
 * 生成深度分析报告。
 */
router.post('/analysis', async (req: Request, res: Response, next) => {
  try {
    const userId = req.body.userId || req.user!.userId;

    // 1. 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 2. 获取用户的练习记录（最近 50 条）
    const practiceRecords = await prisma.practiceRecord.findMany({
      where: { userId },
      include: {
        question: { select: { title: true, category: true, domain: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 3. 获取用户的学习进度
    const learningProgress = await prisma.learningProgress.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });

    // 4. 构建检索查询（分析用户薄弱环节）
    const weakCategories = learningProgress
      .filter((p) => p.avgScore < 70)
      .map((p) => p.category)
      .join(' ');

    const searchQuery = `面试评分标准 典型错误案例 高分技巧 ${weakCategories}`;

    // 5. RAG 检索参考资料
    const retrievedChunks = await ragService.retrieveSimilar(searchQuery, [], 5);

    console.log(
      `[ai:analysis] 检索到 ${retrievedChunks.length} 个相关片段`
    );

    // 6. 构建 Prompt 并调用 LLM
    const { systemPrompt, userPrompt } = ragService.buildAnalysisPrompt(
      user,
      practiceRecords,
      learningProgress,
      retrievedChunks
    );

    const llmResult = await ragService.callLLM(systemPrompt, userPrompt);

    // 7. 构建引用来源
    const citedIndices: number[] = llmResult.citedReferences || [];
    const citations = ragService.buildCitations(retrievedChunks, citedIndices);

    // 8. 组装最终结果
    const result = {
      overallAssessment: llmResult.overallAssessment,
      strengths: llmResult.strengths || [],
      weaknesses: llmResult.weaknesses || [],
      categoryBreakdown: llmResult.categoryBreakdown || [],
      improvementPlan: llmResult.improvementPlan || [],
      recommendedKnowledgeBases: llmResult.recommendedKnowledgeBases || [],
      citations,
    };

    // 9. 存储分析结果
    await prisma.aIAnalysis.create({
      data: {
        userId,
        analysisType: 'PROGRESS',
        analysis: JSON.stringify(result),
        suggestions: JSON.stringify(llmResult.improvementPlan || []),
        strengthsWeaknesses: JSON.stringify({
          strengths: llmResult.strengths || [],
          weaknesses: llmResult.weaknesses || [],
        }),
      },
    });

    res.json({
      data: result,
      message: 'AI 分析完成',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
