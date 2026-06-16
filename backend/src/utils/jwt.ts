import jwt from 'jsonwebtoken';

// ============================================================
// 环境变量默认值
// ============================================================

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
const ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
const REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

// ============================================================
// 类型定义
// ============================================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
}

// ============================================================
// Access Token
// ============================================================

/** 签发短期 Access Token（15 分钟） */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload as object, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRATION,
  } as jwt.SignOptions);
}

/** 验证 Access Token，返回解码后的 payload */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

// ============================================================
// Refresh Token
// ============================================================

/** 签发长期 Refresh Token（7 天） */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload as object, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRATION,
  } as jwt.SignOptions);
}

/** 验证 Refresh Token，返回解码后的 payload */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}
