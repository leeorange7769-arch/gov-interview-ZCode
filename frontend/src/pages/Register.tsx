import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, cn } from '../components/ui';
import { useStore } from '../store';
import { api } from '../utils/api';

// ---------- 表单验证 Schema ----------

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, '请输入您的姓名')
      .max(20, '姓名不超过20个字符'),
    email: z
      .string()
      .min(1, '请输入邮箱地址')
      .email('邮箱格式不正确'),
    password: z
      .string()
      .min(1, '请输入密码')
      .min(6, '密码至少6位')
      .max(32, '密码不超过32位'),
    confirmPassword: z
      .string()
      .min(1, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次密码输入不一致',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ---------- 组件 ----------

export default function Register() {
  const navigate = useNavigate();
  const loginStore = useStore((s) => s.login);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError('');
    try {
      const res = await api.register({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      loginStore(res.user, res.tokens.accessToken);
      navigate('/', { replace: true });
    } catch (err: any) {
      setServerError(err.message || '注册失败，请重试');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">公考面试通</h1>
          <p className="text-gray-500 mt-2">创建账户，开启面试备考之旅</p>
        </div>

        {/* Form Card */}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
              账号注册
            </h2>

            {/* Server Error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="请输入您的姓名"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errors.name ? 'border-red-400' : 'border-gray-200',
                )}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="请输入邮箱"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errors.email ? 'border-red-400' : 'border-gray-200',
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="至少6位密码"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errors.password ? 'border-red-400' : 'border-gray-200',
                )}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="请再次输入密码"
                className={cn(
                  'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errors.confirmPassword ? 'border-red-400' : 'border-gray-200',
                )}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? '注册中...' : '注 册'}
            </Button>

            {/* Link to login */}
            <p className="text-center text-sm text-gray-500">
              已有账号？{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
