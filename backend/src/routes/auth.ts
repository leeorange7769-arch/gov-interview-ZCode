import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  registerRules,
  loginRules,
  refreshRules,
} from '../modules/auth/auth.validator';
import {
  register,
  login,
  refresh,
  logout,
  me,
} from '../modules/auth/auth.controller';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册 — 邮箱 + 密码 + 姓名，phone 可选
 */
router.post('/register', registerRules, register);

/**
 * POST /api/auth/login
 * 用户登录 — 返回 Access Token + Refresh Token
 */
router.post('/login', loginRules, login);

/**
 * POST /api/auth/refresh
 * 刷新 Access Token — 用 Refresh Token 换取新的 Token 对（轮换机制）
 */
router.post('/refresh', refreshRules, refresh);

/**
 * POST /api/auth/logout
 * 用户登出 — 吊销 Refresh Token（需登录）
 */
router.post('/logout', authenticateToken, logout);

/**
 * GET /api/auth/me
 * 获取当前用户信息（需登录）
 */
router.get('/me', authenticateToken, me);

export default router;
