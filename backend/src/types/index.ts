// ============================================================
// 共享类型定义
// ============================================================

/** 注册请求体 */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string; // 预留，后续扩展短信验证
}

/** 登录请求体 */
export interface LoginInput {
  email: string;
  password: string;
}

/** Token 对 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 返回给客户端的用户信息（脱敏） */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  phone?: string | null;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Auth 模块统一的成功响应 */
export interface AuthResponse {
  user: UserResponse;
  tokens: TokenPair;
}
