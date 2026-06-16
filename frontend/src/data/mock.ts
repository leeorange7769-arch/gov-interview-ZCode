// ============================================================
// 题型分类体系（公考结构化面试标准六大题型）
// ============================================================
export const QUESTION_CATEGORIES = [
  '综合分析',
  '计划组织',
  '应急应变',
  '人际关系',
  '自我认知',
  '情景模拟',
] as const;

export type QuestionCategory = typeof QUESTION_CATEGORIES[number];

export const CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
  综合分析: '对社会现象、政策、言论或哲理类材料发表看法，考察分析问题的深度与全面性',
  计划组织: '给定一项工作或活动，考察统筹安排、分工协作与落地执行能力',
  应急应变: '面对突发或具体工作场景，考察临场反应与妥善处理问题的能力',
  人际关系: '处理与领导、同事、群众等之间的关系或矛盾，考察沟通与情商',
  自我认知: '关于自身优劣势、求职动机、岗位匹配度，考察自我认知与职业素养',
  情景模拟: '以角色扮演形式要求"当面表达"，考察语言表达与共情能力',
};

// ============================================================
// 难度等级
// ============================================================
export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
export type Difficulty = typeof DIFFICULTY_LEVELS[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

// ============================================================
// 题目状态
// ============================================================
export type QuestionStatus = 'unattempted' | 'draft' | 'submitted';
export const STATUS_LABELS: Record<QuestionStatus, string> = {
  unattempted: '未作答',
  draft: '草稿',
  submitted: '已提交',
};

// ============================================================
// 话题领域标签
// ============================================================
export const QUESTION_DOMAINS = [
  '时政热点',
  '法治政务',
  '基层治理',
  '乡村振兴',
  '民生服务',
  '作风建设',
  '团队协作',
  '人际沟通',
] as const;

export type QuestionDomain = typeof QUESTION_DOMAINS[number];

// ============================================================
// 题目类型定义
// ============================================================
export interface Question {
  id: string;
  title: string;
  category: QuestionCategory;
  domain: QuestionDomain;
  difficulty: Difficulty;
  tags: string[];
  answer: string;
  // 题目背景/材料（部分综合分析题会有）
  background?: string;
}

export interface ExamSet {
  id: string;
  title: string;
  timeLimit: number;
  questions: Question[];
}

// ============================================================
// 完整题库（15道题，覆盖全部6个题型、8个话题领域、3个难度）
// ============================================================
const ALL_QUESTIONS: Question[] = [
  // ---- 综合分析（4题） ----
  {
    id: 'q1',
    title: '有人说"宁愿少干事，也不愿干错事"，对这种"为官不为"的现象，你怎么看？',
    category: '综合分析',
    domain: '作风建设',
    difficulty: 'medium',
    tags: ['为官不为', '担当作为', '问责', '激励机制', '容错纠错'],
    answer: '指出该现象的本质是责任心和担当精神缺失；分析其危害，影响工作效率、损害政府形象、挫伤群众积极性；剖析根源，考核问责机制不完善、个人能力作风问题；提出对策，健全激励和容错纠错机制，加强教育培训，营造担当作为的氛围。',
  },
  {
    id: 'q2',
    title: '谈谈你对因地制宜发展新质生产力的理解，以及作为公职人员如何践行？',
    category: '综合分析',
    domain: '时政热点',
    difficulty: 'hard',
    tags: ['新质生产力', '高质量发展', '创新', '因地制宜', '大局意识'],
    answer: '坚持以高质量发展为核心；根据地区资源优势挖掘特色产业；推动创新驱动，加强人才培养；强化履职担当，以实干促落实。',
    background: '2024年政府工作报告提出"加快发展新质生产力"，各地纷纷出台相关政策。请结合基层实际谈谈你的看法。',
  },
  {
    id: 'q3',
    title: '近年来"躺平"一词在青年群体中流行，你如何看待这一现象？作为公职人员应如何引导？',
    category: '综合分析',
    domain: '时政热点',
    difficulty: 'medium',
    tags: ['躺平', '青年', '价值观', '奋斗精神', '社会保障'],
    answer: '理性看待"躺平"现象背后的社会压力与个体选择；分析成因：生活成本高、竞争压力大、价值多元；公职人员应加强正面引导，完善社会保障体系，营造公平竞争环境，激发青年奋斗动力。',
  },
  {
    id: 'q4',
    title: '"法治是最好的营商环境"，请结合工作实际谈谈你的理解。',
    category: '综合分析',
    domain: '法治政务',
    difficulty: 'hard',
    tags: ['法治', '营商环境', '依法行政', '公平竞争', '市场主体'],
    answer: '阐述法治对稳定市场主体预期、保护合法权益、规范权力运行的核心作用；结合"放管服"改革实践说明；公职人员应增强法治意识，依法行政、公正执法，以法治化推动营商环境优化。',
  },

  // ---- 计划组织（3题） ----
  {
    id: 'q5',
    title: '单位将在辖区开展一次移风易俗主题宣传活动，领导让你负责组织，你会怎么开展？',
    category: '计划组织',
    domain: '乡村振兴',
    difficulty: 'easy',
    tags: ['移风易俗', '统筹安排', '分工协作', '宣传材料', '总结反馈'],
    answer: '前期做好调研，明确活动主题、对象和形式；制定详细方案，明确时间地点和人员分工；准备宣传手册、案例展板等材料；活动当天做好签到、讲解和互动；活动结束后收集群众反馈，总结经验并持续跟进落实效果。',
  },
  {
    id: 'q6',
    title: '领导安排你负责一次跨部门联合执法行动的协调工作，你会如何统筹安排？',
    category: '计划组织',
    domain: '法治政务',
    difficulty: 'medium',
    tags: ['跨部门', '联合执法', '协调', '方案制定', '信息共享'],
    answer: '明确行动目标与各部门职责分工；召开协调会议、畅通沟通渠道；制定详细行动方案与应急预案；行动中实时调度、信息共享；行动后做好总结评估与反馈整改。',
  },
  {
    id: 'q7',
    title: '社区要举办一场"邻里节"文体活动，由你负责策划，请谈谈你的思路。',
    category: '计划组织',
    domain: '民生服务',
    difficulty: 'easy',
    tags: ['社区活动', '邻里关系', '文体', '策划', '志愿服务'],
    answer: '了解居民需求与兴趣偏好，确定活动形式（文艺汇演、趣味运动会、邻里集市等）；制定预算与筹备时间表；发动社区骨干与志愿者参与；做好安全保障与应急预案；活动后收集反馈、总结经验，建立长效活动机制。',
  },

  // ---- 应急应变（3题） ----
  {
    id: 'q8',
    title: '作为书记员在庭审中发现卷宗缺少关键证据，你该如何处理？',
    category: '应急应变',
    domain: '法治政务',
    difficulty: 'medium',
    tags: ['庭审', '卷宗', '程序正义', '沉着冷静', '汇报'],
    answer: '保持镇定，不慌乱；通过书面条子或适当间隙及时告知法官；庭后做好记录与整理，绝不隐瞒；总结经验，完善归档制度。',
  },
  {
    id: 'q9',
    title: '你在窗口办理业务时，一位群众因材料不齐被拒后情绪激动、大声吵闹，此时你怎么办？',
    category: '应急应变',
    domain: '民生服务',
    difficulty: 'easy',
    tags: ['情绪激动', '耐心解释', '现场秩序', '化解矛盾', '后续跟进'],
    answer: '第一时间安抚情绪，将其引导至一旁单独沟通，避免影响其他群众办事；耐心解释材料要求和办理流程，提供补齐材料的清单或代办渠道；做好登记，必要时协调相关部门加快办理；事后总结经验，优化窗口告知和引导服务流程。',
  },
  {
    id: 'q10',
    title: '某小区因暴雨导致地下车库积水，居民情绪激动围堵物业，你作为街道工作人员到达现场后如何处理？',
    category: '应急应变',
    domain: '基层治理',
    difficulty: 'hard',
    tags: ['突发', '自然灾害', '群众安抚', '抢险', '善后处置'],
    answer: '迅速了解情况，协调消防/物业开展排水抢险；安抚居民情绪，承诺跟踪处理；设置临时安置点与车辆转移方案；查明积水原因推动整改；事后召开协调会，落实责任，防止再次发生。',
  },

  // ---- 人际关系（2题） ----
  {
    id: 'q11',
    title: '你的同事最近因为工作压力大，经常对你发脾气，你会如何处理与他的关系？',
    category: '人际关系',
    domain: '团队协作',
    difficulty: 'easy',
    tags: ['同事关系', '理解包容', '主动沟通', '换位思考', '团队氛围'],
    answer: '理解同事压力大背后的原因，不计较一时情绪；主动私下沟通，了解其困难并提供帮助；工作中互相补位、以诚相待；如情绪持续影响团队氛围，适时向领导反映寻求协调；始终保持积极心态，维护团队和谐。',
  },
  {
    id: 'q12',
    title: '领导在会议上公开批评了你的工作，但你认为是同事提供的数据有误导致的，你怎么办？',
    category: '人际关系',
    domain: '团队协作',
    difficulty: 'medium',
    tags: ['领导批评', '委屈', '沟通', '责任担当', '事后改进'],
    answer: '当场不辩解、虚心接受批评；会后核实数据、查清问题根源；择机向领导汇报真实情况（不推卸责任、重在解决问题）；与同事私下沟通提醒，共同建立数据交叉核验机制；把此事作为改进契机、完善工作流程。',
  },

  // ---- 自我认知（1题） ----
  {
    id: 'q13',
    title: '你即将成为一名基层公务员，你觉得自己最大的优势和不足分别是什么？',
    category: '自我认知',
    domain: '基层治理',
    difficulty: 'easy',
    tags: ['优势', '不足', '基层经验', '学习能力', '改进计划'],
    answer: '客观分析自身优势，如学习能力强、踏实肯干、有较强的沟通协调意愿；坦诚指出不足，如基层工作经验欠缺、部分业务流程不熟悉；提出改进计划，主动向老同志请教、加强业务学习、深入一线积累经验，以弥补短板、发挥所长。',
  },

  // ---- 情景模拟（2题） ----
  {
    id: 'q14',
    title: '你是单位新入职的工作人员，老同事对你有些不满。假设我就是这位老同事，请你当面跟我沟通一下。',
    category: '情景模拟',
    domain: '人际沟通',
    difficulty: 'medium',
    tags: ['尊重', '请教', '态度诚恳', '换位思考', '改进提升'],
    answer: '主动沟通，态度诚恳，先表达对老同事经验和指导的尊重与感谢；坦诚承认自己经验不足，表态愿意虚心学习、尽快提升；邀请老同事多指导、多提建议；表示会用实际行动证明努力和进步，逐步获得认可和信任。',
  },
  {
    id: 'q15',
    title: '你是一名社区网格员，需要入户走访一位独居老人并宣传防诈骗知识。假设我就是这位老人，请你现场模拟。',
    category: '情景模拟',
    domain: '民生服务',
    difficulty: 'medium',
    tags: ['入户走访', '独居老人', '防诈骗', '关怀', '耐心讲解'],
    answer: '礼貌敲门、自我介绍并亮明身份；主动关心老人身体状况和日常生活、拉近距离；用通俗易懂的语言和真实案例讲解常见诈骗手法；帮助老人在手机上设置防骚扰、存好社区联系方式；临走前再次叮嘱"有事先打电话"，让老人感受到温暖与安全。',
  },
];

// 兼容旧版本：MOCK_EXAM_SETS 保持可用（从题库中选取部分构建套卷）
export const MOCK_EXAM_SETS: ExamSet[] = [
  {
    id: 'set-001',
    title: '2026年浙江省法检书记员模拟题本',
    timeLimit: 15,
    questions: ALL_QUESTIONS.filter(q => ['q8', 'q11'].includes(q.id)),
  },
  {
    id: 'set-002',
    title: '2026年时政热点专题',
    timeLimit: 20,
    questions: ALL_QUESTIONS.filter(q => ['q2', 'q3', 'q4'].includes(q.id)),
  },
  {
    id: 'set-003',
    title: '六大题型全真模拟（每类一题）',
    timeLimit: 30,
    questions: ALL_QUESTIONS.filter(q => ['q1', 'q5', 'q9', 'q12', 'q13', 'q14'].includes(q.id)),
  },
];

// 导出完整题库供新页面使用
export { ALL_QUESTIONS };

// ============================================================
// 考试模式定义（模拟考试系统入口）
// ============================================================
export interface ExamMode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class for accent
  defaultCount: number;
  defaultTime: number; // minutes
}

export const EXAM_MODES: ExamMode[] = [
  {
    id: 'smart',
    title: '智能组卷',
    subtitle: 'AI 智能出题',
    description: '根据你的答题历史和薄弱环节，智能生成针对性试卷，精准提升能力短板',
    icon: 'Brain',
    color: 'blue',
    defaultCount: 10,
    defaultTime: 25,
  },
  {
    id: 'specialty',
    title: '专项训练',
    subtitle: '分题型突破',
    description: '针对特定题型或话题领域进行集中训练，逐个击破薄弱环节',
    icon: 'Target',
    color: 'green',
    defaultCount: 6,
    defaultTime: 20,
  },
  {
    id: 'real',
    title: '真题模拟',
    subtitle: '全真考场',
    description: '采用真实考试题量和时间限制，高度还原考场环境，提前适应考试节奏',
    icon: 'FileText',
    color: 'orange',
    defaultCount: 6,
    defaultTime: 30,
  },
  {
    id: 'custom',
    title: '自定义练习',
    subtitle: '自由组合',
    description: '自定义题目数量、考试时长和题型范围，灵活安排练习计划',
    icon: 'Settings',
    color: 'purple',
    defaultCount: 5,
    defaultTime: 15,
  },
];
