// ============================================================
// 答题评分服务 — 四维度关键词评分算法
// 移植自 frontend/src/utils/scorer.ts
// ============================================================

export interface ScoreResult {
  total: number;
  dimensions: {
    points: number;     // 要点覆盖（满分40）
    structure: number;  // 逻辑结构（满分20）
    richness: number;   // 内容丰富度（满分20）
    relevance: number;  // 领域契合度（满分20）
  };
  matchedTags: string[];
  missedTags: string[];
  comments: string[];
}

// 不同"题型"在【逻辑结构】维度上考察的结构性词汇
const STRUCTURE_HINTS: Record<string, string[]> = {
  '综合分析': ['本质', '原因', '影响', '危害', '对策', '建议', '措施', '启示'],
  '计划组织': ['前期', '准备', '事中', '实施', '开展', '过程', '事后', '总结', '分工', '统筹'],
  '应急应变': ['第一时间', '首先', '同时', '其次', '随后', '另外', '事后', '汇报', '处置'],
  '人际关系': ['理解', '沟通', '换位思考', '协调', '反映', '包容'],
  '自我认知': ['优势', '不足', '提升', '改进', '弥补', '学习'],
  '情景模拟': ['尊重', '感谢', '理解', '建议', '行动', '态度'],
};

// 不同"话题领域"在【领域契合度】维度上考察的表述词汇
const DOMAIN_HINTS: Record<string, string[]> = {
  '时政热点': ['高质量发展', '大局', '创新', '改革', '担当'],
  '法治政务': ['依法', '程序', '法律', '法规', '规范'],
  '基层治理': ['群众', '服务', '基层', '为民', '治理'],
  '乡村振兴': ['乡村', '产业', '振兴', '帮扶', '群众'],
  '民生服务': ['群众', '服务', '便民', '满意', '为民'],
  '作风建设': ['担当', '作风', '责任', '务实', '担当作为'],
  '团队协作': ['团队', '协作', '配合', '集体', '沟通'],
  '人际沟通': ['沟通', '理解', '尊重', '态度', '换位思考'],
};

/**
 * 对单道题的作答进行四维度评分
 * @param userAnswer 用户作答文本
 * @param question   { category, domain, tags }
 */
export function analyzeAnswer(
  userAnswer: string,
  question: { category: string; domain: string; tags: string[] }
): ScoreResult {
  const text = userAnswer.trim();
  const len = text.length;

  // 未作答：直接判定为0分
  if (len === 0) {
    return {
      total: 0,
      dimensions: { points: 0, structure: 0, richness: 0, relevance: 0 },
      matchedTags: [],
      missedTags: [...question.tags],
      comments: ['未作答，本题记0分。'],
    };
  }

  // 1. 要点覆盖（满分40）：基于该题专属的 tags（核心考点关键词）
  const matchedTags = question.tags.filter((t) => text.includes(t));
  const missedTags = question.tags.filter((t) => !text.includes(t));
  const points =
    question.tags.length > 0
      ? Math.round((matchedTags.length / question.tags.length) * 40)
      : 0;

  // 2. 逻辑结构（满分20）：根据该题"题型"检测对应的结构性词汇
  const structureHints = STRUCTURE_HINTS[question.category] ?? [];
  const structureHits = structureHints.filter((w) => text.includes(w)).length;
  const structure = Math.min(20, structureHits * 5);

  // 3. 内容丰富度（满分20）：基于作答字数，200字左右封顶
  const richness = Math.min(20, Math.round((len / 200) * 20));

  // 4. 领域契合度（满分20）：根据该题"话题领域"检测相关表述
  const domainHints = DOMAIN_HINTS[question.domain] ?? [];
  const domainHits = domainHints.filter((w) => text.includes(w)).length;
  const relevance = domainHits > 0 ? Math.min(20, 10 + domainHits * 5) : 8;

  const total = Math.min(100, points + structure + richness + relevance);

  // 针对性反馈
  const comments: string[] = [];

  if (matchedTags.length === 0) {
    comments.push(
      `核心要点未覆盖，建议围绕"${question.tags.slice(0, 3).join('、')}"等方面展开作答。`
    );
  } else if (missedTags.length === 0) {
    comments.push('核心要点覆盖全面，要点把握准确。');
  } else {
    comments.push(
      `已覆盖要点：${matchedTags.join('、')}；可补充：${missedTags.join('、')}。`
    );
  }

  comments.push(
    structureHits === 0
      ? `作答逻辑有待加强，该题型可尝试使用"${structureHints.slice(0, 3).join('、')}"等词梳理思路。`
      : '作答逻辑较为清晰，体现了该题型应有的作答框架。'
  );

  comments.push(
    len < 100
      ? '内容略显单薄，建议结合具体做法或事例展开论述。'
      : '内容较为充实，论述展开充分。'
  );

  comments.push(
    domainHits === 0
      ? `表述上可适当结合"${domainHints.slice(0, 2).join('、')}"等说法，体现对该领域工作的理解。`
      : '相关领域的表述较为到位，体现了一定的政策理论素养。'
  );

  return {
    total: Math.floor(total),
    dimensions: { points, structure, richness, relevance },
    matchedTags,
    missedTags,
    comments,
  };
}
