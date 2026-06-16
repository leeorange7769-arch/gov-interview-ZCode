import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 六种题型分类
const ALL_CATEGORIES = ['综合分析', '计划组织', '应急应变', '人际关系', '自我认知', '情景模拟'];

/**
 * GET /api/user/dashboard
 * 获取用户仪表盘数据
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.userId;

    // 并行获取基础数据
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // ---------- 统计数据 ----------
    const [totalPractices, totalExams, practiceAgg, examAgg] = await Promise.all([
      prisma.practiceRecord.count({ where: { userId } }),
      prisma.examRecord.count({ where: { userId } }),
      // 练习平均分
      prisma.practiceRecord.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
      // 考试平均分
      prisma.examRecord.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
    ]);

    const practiceAvg = practiceAgg._avg.score ?? 0;
    const examAvg = examAgg._avg.score ?? 0;

    // 加权平均分：练习和考试各占权重（按各自数量加权）
    const totalRecords = totalPractices + totalExams;
    const avgScore = totalRecords > 0
      ? Math.round((practiceAvg * totalPractices + examAvg * totalExams) / totalRecords)
      : 0;

    // ---------- 连续打卡天数 ----------
    const consecutiveDays = await calcConsecutiveDays(userId);

    // ---------- 近7天学习趋势 ----------
    const trend = await calc7DayTrend(userId);

    // ---------- 六维能力 ----------
    const abilities = await calcAbilities(userId);

    // ---------- 最近训练记录 ----------
    const recentRecords = await getRecentRecords(userId);

    res.json({
      user,
      stats: {
        totalPractices,
        totalExams,
        avgScore,
        consecutiveDays,
      },
      trend,
      abilities,
      recentRecords,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 计算连续打卡天数（从今天往前推）
 */
async function calcConsecutiveDays(userId: string): Promise<number> {
  // 获取用户所有练习和考试的日期（去重，按日期倒序）
  const practiceDates = await prisma.practiceRecord.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const examDates = await prisma.examRecord.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // 合并并提取日期字符串（YYYY-MM-DD），去重
  const allDates = new Set<string>();
  for (const r of practiceDates) {
    allDates.add(r.createdAt.toISOString().slice(0, 10));
  }
  for (const r of examDates) {
    allDates.add(r.createdAt.toISOString().slice(0, 10));
  }

  // 从今天开始往前数连续天数
  let consecutive = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    if (allDates.has(dateStr)) {
      consecutive++;
    } else if (i === 0) {
      // 今天没打卡，从昨天开始算
      continue;
    } else {
      break;
    }
  }

  return consecutive;
}

/**
 * 计算近7天学习趋势（日期、平均分、练习次数）
 */
async function calc7DayTrend(userId: string) {
  const days: { date: string; score: number; count: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

    const [practiceCount, examCount, practiceScore, examScore] = await Promise.all([
      prisma.practiceRecord.count({
        where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.examRecord.count({
        where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.practiceRecord.aggregate({
        where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
        _avg: { score: true },
      }),
      prisma.examRecord.aggregate({
        where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
        _avg: { score: true },
      }),
    ]);

    const count = practiceCount + examCount;
    const pAvg = practiceScore._avg.score ?? 0;
    const eAvg = examScore._avg.score ?? 0;
    const total = practiceCount + examCount;
    const score = total > 0
      ? Math.round((pAvg * practiceCount + eAvg * examCount) / total)
      : 0;

    days.push({ date: dateStr, score, count });
  }

  return days;
}

/**
 * 计算六维能力（基于 LearningProgress 表）
 */
async function calcAbilities(userId: string) {
  const progressList = await prisma.learningProgress.findMany({
    where: { userId },
  });

  const progressMap = new Map(progressList.map(p => [p.category, p]));

  return ALL_CATEGORIES.map(category => {
    const progress = progressMap.get(category);
    return {
      category,
      score: progress ? Math.round(progress.avgScore) : 0,
      fullMark: 100,
      count: progress?.totalPractices ?? 0,
    };
  });
}

/**
 * 获取最近5条训练记录（合并练习和考试）
 */
async function getRecentRecords(userId: string) {
  const [practices, exams] = await Promise.all([
    prisma.practiceRecord.findMany({
      where: { userId },
      include: { question: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.examRecord.findMany({
      where: { userId },
      include: { questionSet: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // 合并、按时间排序、取前5
  const merged = [
    ...practices.map(p => ({
      id: p.id,
      type: 'practice' as const,
      title: p.question.title,
      score: p.score,
      createdAt: p.createdAt.toISOString(),
    })),
    ...exams.map(e => ({
      id: e.id,
      type: 'exam' as const,
      title: e.questionSet.title,
      score: e.score,
      createdAt: e.createdAt.toISOString(),
    })),
  ];

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return merged.slice(0, 5);
}

export default router;
