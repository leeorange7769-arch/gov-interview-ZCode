import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import questionRoutes from './routes/questions';
import adminQuestionRoutes from './routes/adminQuestions';
import { categoriesPublicRouter, categoriesAdminRouter } from './routes/categories';
import examRoutes from './routes/exams';
import practiceRoutes from './routes/practice';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import knowledgeBaseRoutes from './routes/knowledgeBases';
import aiRoutes from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- 中间件 ---------------
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));

// --------------- 路由 ---------------
// 认证
app.use('/api/auth', authRoutes);

// 公开 — 题库查询
app.use('/api/questions', questionRoutes);

// 公开 — 分类树
app.use('/api/categories', categoriesPublicRouter);

// 管理员 — 题库管理
app.use('/api/admin/questions', adminQuestionRoutes);

// 管理员 — 分类管理
app.use('/api/admin/categories', categoriesAdminRouter);

// 管理员 — 用户管理 & 数据统计
app.use('/api/admin', adminRoutes);

// 管理员 — 知识库管理（RAG 知识库 / NotebookLM 来源功能）
app.use('/api/admin/knowledgebases', knowledgeBaseRoutes);

// AI 评分与分析（登录用户 — RAG 增强问答功能）
app.use('/api/ai', aiRoutes);

// 考试 & 练习
app.use('/api/exams', examRoutes);
app.use('/api/practice', practiceRoutes);

// 用户 — 仪表盘等
app.use('/api/user', userRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- 全局错误处理 ---------------
app.use(errorHandler);

// --------------- 启动服务 ---------------
app.listen(PORT, () => {
  console.log(`[server] 公考面试通后端已启动: http://localhost:${PORT}`);
  console.log('');
  console.log('API 路由:');
  console.log('  公开接口:');
  console.log('    GET  /api/health');
  console.log('    GET  /api/questions?category=&domain=&difficultyLevel=&keyword=&page=1&pageSize=20');
  console.log('    GET  /api/questions/:id');
  console.log('    GET  /api/questions/categories/list');
  console.log('    GET  /api/categories/tree');
  console.log('    GET  /api/categories/flat');
  console.log('  认证:');
  console.log('    POST /api/auth/login');
  console.log('    POST /api/auth/register');
  console.log('    GET  /api/auth/me');
  console.log('  管理员 (需 Bearer token + ADMIN 角色):');
  console.log('    GET    /api/admin/questions');
  console.log('    POST   /api/admin/questions');
  console.log('    PUT    /api/admin/questions/:id');
  console.log('    DELETE /api/admin/questions/:id');
  console.log('    POST   /api/admin/questions/batch-import');
  console.log('    GET    /api/admin/categories');
  console.log('    POST   /api/admin/categories');
  console.log('    PUT    /api/admin/categories/:id');
  console.log('    DELETE /api/admin/categories/:id');
  console.log('    POST   /api/admin/knowledgebases       — 创建知识库');
  console.log('    GET    /api/admin/knowledgebases       — 知识库列表');
  console.log('    GET    /api/admin/knowledgebases/:id   — 知识库详情');
  console.log('    DELETE /api/admin/knowledgebases/:id   — 删除知识库');
  console.log('    POST   /api/admin/knowledgebases/:id/upload — 上传文档到知识库');
  console.log('  AI 功能 (需登录):');
  console.log('    POST /api/ai/score     — AI 单题评分（RAG 增强 + 引用标注）');
  console.log('    POST /api/ai/analysis  — AI 薄弱板块综合分析（RAG 增强）');
});

export default app;
