import prisma from '../utils/prisma';
import { embeddingService } from './EmbeddingService';
import OpenAI from 'openai';

/**
 * 检索到的文档片段
 */
export interface RetrievedChunk {
  id: string;
  content: string;
  fileName: string;
  fileType: string;
  chunkIndex: number;
  knowledgeBaseName: string;
  similarity: number;
  metadata: Record<string, any>;
}

/**
 * AI 评分结果
 */
export interface ScoreResult {
  totalScore: number;
  dimensions: {
    contentAccuracy: { score: number; maxScore: number; comment: string };
    structureLogic: { score: number; maxScore: number; comment: string };
    expressionRichness: { score: number; maxScore: number; comment: string };
    policyRelevance: { score: number; maxScore: number; comment: string };
  };
  overallComment: string;
  improvementSuggestions: string[];
  citations: Citation[];
}

/**
 * AI 分析报告
 */
export interface AnalysisReport {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  categoryBreakdown: {
    category: string;
    avgScore: number;
    trend: 'improving' | 'declining' | 'stable';
    comment: string;
  }[];
  improvementPlan: string[];
  recommendedKnowledgeBases: string[];
  citations: Citation[];
}

/**
 * 引用标注（类似 NotebookLM 的引用功能）
 */
export interface Citation {
  documentName: string;
  chunkContent: string;
  knowledgeBaseName: string;
  similarity: number;
}

/**
 * RAGService — 检索增强生成服务
 *
 * 核心能力：
 * 1. 向量相似度检索（pgvector cosine distance）
 * 2. Prompt 组装（评分 / 分析）
 * 3. LLM 调用（OpenAI 兼容 API）
 */
export class RAGService {
  private llmClient: OpenAI;
  private llmModel: string;

  constructor() {
    this.llmClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-missing',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    this.llmModel = process.env.LLM_MODEL || 'gpt-4o';
  }

  // ================================================================
  // 1. 向量检索
  // ================================================================

  /**
   * 在知识库中检索与查询语义最相似的文档片段
   *
   * @param query 查询文本
   * @param knowledgeBaseIds 限定检索的知识库ID列表（空数组=全部知识库）
   * @param topK 返回 Top-K 个最相关片段
   */
  async retrieveSimilar(
    query: string,
    knowledgeBaseIds: string[] = [],
    topK: number = 5
  ): Promise<RetrievedChunk[]> {
    // 将查询文本向量化
    const queryEmbedding = await embeddingService.embedText(query);

    // pgvector 向量格式：将 number[] 转为 PostgreSQL 数组字符串
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // 构建 SQL 查询（cosine distance: <=> 运算符）
    let sql: string;
    let params: any[];

    if (knowledgeBaseIds.length > 0) {
      // 限定知识库
      const placeholders = knowledgeBaseIds.map(() => '?').join(',');
      sql = `
        SELECT
          d.id,
          d.content,
          d."fileName",
          d."fileType",
          d."chunkIndex",
          d.metadata,
          kb.name AS "knowledgeBaseName",
          1 - (d.embedding <=> $1::vector) AS similarity
        FROM documents d
        JOIN knowledge_bases kb ON d."knowledgeBaseId" = kb.id
        WHERE d."knowledgeBaseId" IN (${placeholders})
        ORDER BY d.embedding <=> $1::vector
        LIMIT $2
      `;
      params = [vectorStr, ...knowledgeBaseIds, topK];
    } else {
      // 全部知识库检索
      sql = `
        SELECT
          d.id,
          d.content,
          d."fileName",
          d."fileType",
          d."chunkIndex",
          d.metadata,
          kb.name AS "knowledgeBaseName",
          1 - (d.embedding <=> $1::vector) AS similarity
        FROM documents d
        JOIN knowledge_bases kb ON d."knowledgeBaseId" = kb.id
        ORDER BY d.embedding <=> $1::vector
        LIMIT $2
      `;
      params = [vectorStr, topK];
    }

    // 执行原始 SQL 查询
    const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(sql, ...params);

    // 解析 metadata JSON 字符串
    return rows.map((row: any) => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      similarity: parseFloat(row.similarity),
    }));
  }

  // ================================================================
  // 2. Prompt 组装 — 评分
  // ================================================================

  /**
   * 构建评分 Prompt（系统消息 + 用户消息）
   */
  buildScoringPrompt(
    question: {
      title: string;
      category: string;
      domain: string;
      tags: string;
      answer: string;
    },
    userAnswer: string,
    retrievedChunks: RetrievedChunk[]
  ): { systemPrompt: string; userPrompt: string } {
    // 整理参考资料
    const referencesText = retrievedChunks
      .map(
        (chunk, i) =>
          `【参考资料 ${i + 1}】来源：《${chunk.knowledgeBaseName}》- ${chunk.fileName}\n${chunk.content}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = `你是一位资深的公务员面试考官，拥有丰富的评分经验。你需要根据以下参考资料对考生的面试作答进行专业评分。

## 评分维度（总分 100 分）
1. **内容准确性（25分）**：回答是否切题、观点是否正确、对政策的理解是否到位
2. **结构逻辑性（25分）**：回答结构是否清晰、逻辑是否严密、论证是否有力
3. **表达丰富性（25分）**：语言表达是否流畅、用词是否准确、论据是否充实
4. **政策关联性（25分）**：是否结合实际、是否体现政策素养、是否展现公共服务意识

## 参考资料
${referencesText || '（无相关参考资料，请基于通用知识评分）'}

## 输出要求
请以 JSON 格式输出评分结果，格式如下：
{
  "totalScore": 数字,
  "dimensions": {
    "contentAccuracy": { "score": 数字, "maxScore": 25, "comment": "评语" },
    "structureLogic": { "score": 数字, "maxScore": 25, "comment": "评语" },
    "expressionRichness": { "score": 数字, "maxScore": 25, "comment": "评语" },
    "policyRelevance": { "score": 数字, "maxScore": 25, "comment": "评语" }
  },
  "overallComment": "总体评价",
  "improvementSuggestions": ["建议1", "建议2"],
  "citedReferences": [0, 2]  // 引用的参考资料序号（从0开始）
}

请确保输出是严格的 JSON 格式，不要包含 markdown 代码块标记。`;

    // 解析 tags JSON 字符串
    let tagsStr = '';
    try {
      tagsStr = JSON.parse(question.tags).join('、');
    } catch {
      tagsStr = question.tags;
    }

    const userPrompt = `请对以下考生答案进行评分：

【题目】
${question.title}

【题型】${question.category}
【领域】${question.domain}
【核心考点】${tagsStr}

【参考答案】
${question.answer}

【考生答案】
${userAnswer}

请基于参考资料和你的专业知识进行评分。`;

    return { systemPrompt, userPrompt };
  }

  // ================================================================
  // 3. Prompt 组装 — 综合分析
  // ================================================================

  /**
   * 构建学习分析 Prompt
   */
  buildAnalysisPrompt(
    user: { name: string; email: string },
    practiceRecords: any[],
    learningProgress: any[],
    retrievedChunks: RetrievedChunk[]
  ): { systemPrompt: string; userPrompt: string } {
    const referencesText = retrievedChunks
      .map(
        (chunk, i) =>
          `【参考资料 ${i + 1}】来源：《${chunk.knowledgeBaseName}》- ${chunk.fileName}\n${chunk.content}`
      )
      .join('\n\n---\n\n');

    // 汇总练习记录
    const recordsSummary = practiceRecords
      .map((r: any) => {
        const dims = typeof r.dimensions === 'string' ? JSON.parse(r.dimensions) : r.dimensions;
        return `- [${r.question?.category || '未知'}] ${r.question?.title || '未知题目'} — 得分: ${r.score} — 时间: ${new Date(r.createdAt).toLocaleDateString('zh-CN')}`;
      })
      .join('\n');

    // 汇总学习进度
    const progressSummary = learningProgress
      .map((p: any) => {
        const dims = typeof p.dimensions === 'string' ? JSON.parse(p.dimensions) : p.dimensions;
        return `- 题型「${p.category}」: 练习 ${p.totalPractices} 次，平均分 ${p.avgScore}`;
      })
      .join('\n');

    const systemPrompt = `你是一位资深的公务员面试培训专家，擅长分析学员的学习情况并给出针对性建议。

## 参考资料（面试评分标准、典型错误案例等）
${referencesText || '（无相关参考资料）'}

## 输出要求
请以 JSON 格式输出分析报告：
{
  "overallAssessment": "总体评价（200字以内）",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "categoryBreakdown": [
    {
      "category": "题型名称",
      "avgScore": 数字,
      "trend": "improving|declining|stable",
      "comment": "分析"
    }
  ],
  "improvementPlan": ["改进建议1", "改进建议2"],
  "recommendedKnowledgeBases": ["推荐查阅的知识库名称1"],
  "citedReferences": [0]
}

请确保输出是严格的 JSON 格式，不要包含 markdown 代码块标记。`;

    const userPrompt = `请对以下学员的训练数据进行分析：

【学员】${user.name} (${user.email})

【练习记录】
${recordsSummary || '暂无练习记录'}

【学习进度】
${progressSummary || '暂无学习进度'}

请综合分析该学员的面试备考情况，给出改进建议。`;

    return { systemPrompt, userPrompt };
  }

  // ================================================================
  // 4. LLM 调用
  // ================================================================

  /**
   * 调用 LLM 并解析 JSON 响应
   */
  async callLLM(systemPrompt: string, userPrompt: string): Promise<any> {
    const response = await this.llmClient.chat.completions.create({
      model: this.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM 返回为空');
    }

    try {
      return JSON.parse(content);
    } catch {
      // 如果返回不是有效 JSON，尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('LLM 返回格式错误，无法解析 JSON');
    }
  }

  /**
   * 从检索结果构建 Citation 列表
   */
  buildCitations(retrievedChunks: RetrievedChunk[], citedIndices: number[]): Citation[] {
    return citedIndices
      .filter((i) => i >= 0 && i < retrievedChunks.length)
      .map((i) => ({
        documentName: retrievedChunks[i].fileName,
        chunkContent: retrievedChunks[i].content.substring(0, 200) + '...',
        knowledgeBaseName: retrievedChunks[i].knowledgeBaseName,
        similarity: retrievedChunks[i].similarity,
      }));
  }
}

export const ragService = new RAGService();
