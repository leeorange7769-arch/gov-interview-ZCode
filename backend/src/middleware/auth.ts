import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';

// 扩展 Express Request 类型，挂载当前用户信息
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT 认证中间件 — 强制要求登录
 * 从 Authorization: Bearer <accessToken> 中提取并验证 Access Token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

/**
 * 可选认证中间件 — 有 token 就解析，没有也放行
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // token 无效也放行，由具体路由决定是否拒绝
    }
  }
  next();
}

/**
 * 管理员权限中间件 — 需配合 authenticateToken 使用
 * 检查当前用户 role 是否为 ADMIN
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}

// 向后兼容别名（保留旧引用不报错）
export { authenticateToken as authenticate };
