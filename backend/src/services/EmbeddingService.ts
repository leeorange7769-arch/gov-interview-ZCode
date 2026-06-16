import OpenAI from 'openai';

/**
 * EmbeddingService — 文本向量化服务
 *
 * 封装 OpenAI 兼容的 Embedding API 调用，支持：
 * - OpenAI text-embedding-3-small (默认 1536 维)
 * - 任何 OpenAI 兼容的向量服务（通过配置 OPENAI_BASE_URL 切换）
 */
export class EmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimensions: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-missing',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    // text-embedding-3-small 默认输出 1536 维
    this.dimensions = 1536;
  }

  /**
   * 将单段文本转换为向量
   */
  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    });

    return response.data[0].embedding;
  }

  /**
   * 批量将多段文本转换为向量（效率更高）
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    // 按输入顺序返回
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }
}

export const embeddingService = new EmbeddingService();
