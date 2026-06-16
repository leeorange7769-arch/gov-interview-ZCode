import bcrypt from 'bcryptjs';
import prisma from '../../utils/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  TokenPair,
  UserResponse,
} from '../../types';

// ============================================================
// 辅助函数
// ============================================================

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/** 将 User 数据库行转为客户端安全的 UserResponse */
function toUserResponse(user: {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  phone: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** 生成 Access + Refresh Token 对，并将 Refresh Token 的 bcrypt hash 写入 DB */
async function generateTokens(userId: string, email: string, role: 'ADMIN' | 'USER'): Promise<TokenPair> {
  const accessToken = signAccessToken({ userId, email, role });
  const refreshToken = signRefreshToken({ userId });

  // 将 refresh token 的 hash 存入数据库（支持服务端吊销）
  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: refreshTokenHash },
  });

  return { accessToken, refreshToken };
}

// ============================================================
// 公开方法
// ============================================================

/**
 * 用户注册
 * - 邮箱 + 密码 必填，name 必填
 * - phone 可选（预留短信验证接口）
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { email, password, name, phone } = input;

  // 检查邮箱唯一性
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('该邮箱已被注册', 409);
  }

  // 密码加密
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 创建用户
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone: phone || null },
  });

  // 签发双 token
  const tokens = await generateTokens(user.id, user.email, user.role as 'ADMIN' | 'USER');

  return {
    user: toUserResponse({ ...user, role: user.role as 'ADMIN' | 'USER' }),
    tokens,
  };
}

/**
 * 用户登录
 * - 验证邮箱 + 密码
 * - 返回 Access Token + Refresh Token
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('邮箱或密码错误', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('邮箱或密码错误', 401);
  }

  // 签发双 token（刷新令牌轮换）
  const tokens = await generateTokens(user.id, user.email, user.role as 'ADMIN' | 'USER');

  return {
    user: toUserResponse({ ...user, role: user.role as 'ADMIN' | 'USER' }),
    tokens,
  };
}

/**
 * 刷新 Access Token
 * - 用 Refresh Token 换取新的 Access Token（同时轮换 Refresh Token）
 */
export async function refresh(refreshToken: string): Promise<TokenPair> {
  // 1. 验证 JWT 签名和过期时间
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Refresh Token 无效或已过期', 401);
  }

  // 2. 查询用户，确认 Refresh Token 未被吊销
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.refreshToken) {
    throw new AppError('Refresh Token 已被吊销', 401);
  }

  // 3. 比对传入的 refreshToken 与数据库中存储的 hash
  const tokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!tokenValid) {
    // token 不匹配 → 可能是旧 token 被重复使用，吊销所有 token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null },
    });
    throw new AppError('Refresh Token 已被使用过，请重新登录', 401);
  }

  // 4. 轮换：签发新 token 对，旧 refresh token 自动失效
  return generateTokens(user.id, user.email, user.role as 'ADMIN' | 'USER');
}

/**
 * 用户登出
 * - 清除数据库中的 Refresh Token，实现服务端吊销
 */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

/**
 * 获取当前用户信息
 */
export async function getProfile(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  return toUserResponse({ ...user, role: user.role as 'ADMIN' | 'USER' });
}
