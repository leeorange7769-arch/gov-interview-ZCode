import { body } from 'express-validator';

/**
 * 注册请求校验规则
 * - email: 必填，合法邮箱格式
 * - password: 必填，至少 6 位
 * - name: 必填，至少 1 位
 * - phone: 可选（预留短信验证接口）
 */
export const registerRules = [
  body('email')
    .isEmail()
    .withMessage('请提供有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要 6 个字符'),
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('姓名不能为空'),
  body('phone')
    .optional({ values: 'null' })
    .isMobilePhone('any')
    .withMessage('请提供有效的手机号码'),
];

/**
 * 登录请求校验规则
 * - email: 必填
 * - password: 必填
 */
export const loginRules = [
  body('email')
    .isEmail()
    .withMessage('请提供有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
];

/**
 * 刷新 token 请求校验规则
 */
export const refreshRules = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh Token 不能为空'),
];
