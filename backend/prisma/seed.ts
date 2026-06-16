// ============================================================
// 种子数据 — 初始化题库数据、分类树和管理员账号
// 数据库: PostgreSQL + pgvector
// ============================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 难度星级 → 难度级别映射
function diffLevel(d: number): string {
  if (d <= 2) return 'easy';
  if (d === 3) return 'medium';
  return 'hard';
}

const questions = [
  {
    title: '作为一名新入职的书记员，若在庭审中发现卷宗缺少关键证据，你该如何处理？',
    category: '应急应变',
    domain: '法治政务',
    tags: JSON.stringify(['庭审', '卷宗', '程序正义', '沉着冷静', '汇报']),
    answer:
      '保持镇定，不慌乱；通过书面条子或适当间隙及时告知法官；庭后做好记录与整理，绝不隐瞒；总结经验，完善归档制度。',
    hint: '本题考察应急处突能力。答题要点：①保持冷静是第一位的；②按程序及时逐级汇报；③注意方式方法（避免影响庭审）；④事后总结改进制度。',
    difficulty: 3,
    difficultyLevel: diffLevel(3),
  },
  {
    title: '面对来访群众的抱怨，你作为窗口工作人员该如何进行诉源治理？',
    category: '人际关系',
    domain: '基层治理',
    tags: JSON.stringify(['诉源治理', '群众', '化解矛盾', '倾听', '服务意识']),
    answer:
      '热情接待，耐心倾听；不推诿，解释相关法规；通过调解方式前移化解矛盾；做好登记引导，让群众最多跑一次。',
    hint: '围绕"诉源治理"核心概念展开：①前端化解（倾听+释法）；②中端调解（整合资源）；③末端引导（告知合法途径）。体现服务意识和法治思维。',
    difficulty: 3,
    difficultyLevel: diffLevel(3),
  },
  {
    title: '谈谈你对因地制宜发展新质生产力的理解，以及作为公职人员如何践行？',
    category: '综合分析',
    domain: '时政热点',
    tags: JSON.stringify(['新质生产力', '高质量发展', '创新', '因地制宜', '大局意识']),
    answer:
      '坚持以高质量发展为核心；根据地区资源优势挖掘特色产业；推动创新驱动，加强人才培养；强化履职担当，以实干促落实。',
    hint: '分两层作答：①理论层面——解释"新质生产力"（创新驱动、高科技、高效能、高质量）；②实践层面——结合公职岗位谈具体做法（学习、调研、执行、创新）。',
    difficulty: 4,
    difficultyLevel: diffLevel(4),
  },
  {
    title: '有人说"宁愿少干事，也不愿干错事"，对这种"为官不为"的现象，你怎么看？',
    category: '综合分析',
    domain: '作风建设',
    tags: JSON.stringify(['为官不为', '担当作为', '问责', '激励机制', '容错纠错']),
    answer:
      '指出该现象的本质是责任心和担当精神缺失；分析其危害，影响工作效率、损害政府形象、挫伤群众积极性；剖析根源，考核问责机制不完善、个人能力作风问题；提出对策，健全激励和容错纠错机制，加强教育培训，营造担当作为的氛围。',
    hint: '综合分析类经典框架：①破题表态（反对"躺平"思想）；②原因分析（制度+个人）；③危害分析（对群众/政府/个人）；④对策建议（制度完善+教育引导）。',
    difficulty: 4,
    difficultyLevel: diffLevel(4),
  },
  {
    title: '单位将在辖区开展一次移风易俗主题宣传活动，领导让你负责组织，你会怎么开展？',
    category: '计划组织',
    domain: '乡村振兴',
    tags: JSON.stringify(['移风易俗', '统筹安排', '分工协作', '宣传材料', '总结反馈']),
    answer:
      '前期做好调研，明确活动主题、对象和形式；制定详细方案，明确时间地点和人员分工；准备宣传手册、案例展板等材料；活动当天做好签到、讲解和互动；活动结束后收集群众反馈，总结经验并持续跟进落实效果。',
    hint: '计划组织类标准框架：①事前准备（调研→方案→物资→分工）；②事中执行（按方案推进+应急处理）；③事后总结（反馈收集+长效机制）。',
    difficulty: 3,
    difficultyLevel: diffLevel(3),
  },
  {
    title: '你在窗口办理业务时，一位群众因材料不齐被拒后情绪激动、大声吵闹，此时你怎么办？',
    category: '应急应变',
    domain: '民生服务',
    tags: JSON.stringify(['情绪激动', '耐心解释', '现场秩序', '化解矛盾', '后续跟进']),
    answer:
      '第一时间安抚情绪，将其引导至一旁单独沟通，避免影响其他群众办事；耐心解释材料要求和办理流程，提供补齐材料的清单或代办渠道；做好登记，必要时协调相关部门加快办理；事后总结经验，优化窗口告知和引导服务流程。',
    hint: '应急处突四步法：①稳控现场（安抚+隔离）；②了解诉求（倾听+共情）；③解决问题（解释+引导）；④反思改进（制度完善）。',
    difficulty: 3,
    difficultyLevel: diffLevel(3),
  },
  {
    title: '你的同事最近因为工作压力大，经常对你发脾气，你会如何处理与他的关系？',
    category: '人际关系',
    domain: '团队协作',
    tags: JSON.stringify(['同事关系', '理解包容', '主动沟通', '换位思考', '团队氛围']),
    answer:
      '理解同事压力大背后的原因，不计较一时情绪；主动私下沟通，了解其困难并提供帮助；工作中互相补位、以诚相待；如情绪持续影响团队氛围，适时向领导反映寻求协调；始终保持积极心态，维护团队和谐。',
    hint: '人际关系处理思路：①阳光心态（不激化矛盾）；②主动沟通（私下+真诚）；③提供帮助（了解困难+分担工作）；④适度借力（必要时请领导协调）。',
    difficulty: 3,
    difficultyLevel: diffLevel(3),
  },
  {
    title: '你即将成为一名基层公务员，你觉得自己最大的优势和不足分别是什么？',
    category: '自我认知',
    domain: '基层治理',
    tags: JSON.stringify(['优势', '不足', '基层经验', '学习能力', '改进计划']),
    answer:
      '客观分析自身优势，如学习能力强、踏实肯干、有较强的沟通协调意愿；坦诚指出不足，如基层工作经验欠缺、部分业务流程不熟悉；提出改进计划，主动向老同志请教、加强业务学习、深入一线积累经验，以弥补短板、发挥所长。',
    hint: '自我认知题答题要点：①优势要具体（举例说明）；②不足要真诚但非致命（选可改进的）；③改进计划要有针对性（学习+实践+请教）。',
    difficulty: 2,
    difficultyLevel: diffLevel(2),
  },
  {
    title:
      '假如你是单位新入职的工作人员，因为经验不足，老同事对你有些不满。假设我就是这位老同事，请你当面跟我沟通一下。',
    category: '情景模拟',
    domain: '人际沟通',
    tags: JSON.stringify(['尊重', '请教', '态度诚恳', '换位思考', '改进提升']),
    answer:
      '主动沟通，态度诚恳，先表达对老同事经验和指导的尊重与感谢；坦诚承认自己经验不足，表态愿意虚心学习、尽快提升；邀请老同事多指导、多提建议；表示会用实际行动证明努力和进步，逐步获得认可和信任。',
    hint: '情景模拟题注意：①开场要自然（称呼+问候）；②语气要谦虚诚恳；③内容要有具体承诺；④结尾表达感谢和决心。',
    difficulty: 4,
    difficultyLevel: diffLevel(4),
  },
];

// 分类树数据（六大题型 → 子分类）
const categoryTree = [
  {
    name: '综合分析',
    children: ['社会现象类', '观点态度类', '哲理故事类', '政策理解类'],
  },
  {
    name: '计划组织',
    children: ['调研类', '宣传类', '活动类', '会议类'],
  },
  {
    name: '应急应变',
    children: ['工作突发事件', '群众冲突事件', '舆情应对'],
  },
  {
    name: '人际关系',
    children: ['与领导关系', '与同事关系', '与群众关系'],
  },
  {
    name: '自我认知',
    children: ['自我介绍', '职业规划', '岗位认知'],
  },
  {
    name: '情景模拟',
    children: ['现场劝说', '会议发言', '媒体沟通'],
  },
];

async function main() {
  console.log('[seed] 开始播种...');

  // 清空已有数据（按依赖顺序）
  await prisma.aIAnalysis.deleteMany();
  await prisma.practiceRecord.deleteMany();
  await prisma.examRecord.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.questionSetItem.deleteMany();
  await prisma.questionSet.deleteMany();
  await prisma.question.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ─── 1. 创建管理员用户 ─────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@gov.interview',
      passwordHash: adminPassword,
      name: '系统管理员',
      role: 'ADMIN',
    },
  });
  console.log('[seed] ✅ 管理员账号: admin@gov.interview / admin123');

  // ─── 2. 创建分类树 ─────────────────────────────────
  for (const cat of categoryTree) {
    const parent = await prisma.category.create({
      data: { name: cat.name, sortOrder: categoryTree.indexOf(cat) },
    });
    for (const childName of cat.children) {
      await prisma.category.create({
        data: {
          name: childName,
          parentId: parent.id,
          sortOrder: cat.children.indexOf(childName),
        },
      });
    }
  }
  console.log(`[seed] ✅ 已创建 ${categoryTree.length} 个父分类及子分类`);

  // ─── 3. 创建题目 ───────────────────────────────────
  for (const q of questions) {
    await prisma.question.create({ data: q });
  }
  console.log(`[seed] ✅ 已创建 ${questions.length} 道题目`);

  console.log('[seed] 🎉 播种完成！');
}

main()
  .catch((e) => {
    console.error('[seed] 错误:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
