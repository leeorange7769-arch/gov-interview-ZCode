import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import * as authService from './auth.service';
import { AppError } from '../../middleware/errorHandler';
import type { RegisterInput, LoginInput } from '../../types';

// ============================================================
// 辅助：校验结果检查
// ============================================================

/** 检查 express-validator 校验结果，有错误则抛出 400 */
function validate(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e: ValidationError) => e.msg).join('; ');
    throw new AppError(messages, 400);
  }
}

// ============================================================
// 控制器方法
// ============================================================

/**
 * POST /api/auth/register
 * 用户注册
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validate(req);

    const input: RegisterInput = {
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      phone: req.body.phone || undefined,
    };

    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * 用户登录
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validate(req);

    const input: LoginInput = {
      email: req.body.email,
      password: req.body.password,
    };

    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * 刷新 Access Token（同时轮换 Refresh Token）
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validate(req);

    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json({ tokens });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * 用户登出（需登录状态）
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    await authService.logout(userId);
    res.json({ message: '已成功登出' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * 获取当前用户信息（需登录状态）
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await authService.getProfile(userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
