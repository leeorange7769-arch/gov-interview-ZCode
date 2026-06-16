import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
// pdf-parse is a CJS module without proper type definitions
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

/**
 * 文本分块结构
 */
export interface TextChunk {
  content: string;
  metadata: {
    chunkIndex: number;
    pageNumber?: number;
    startLine?: number;
  };
}

/**
 * DocumentProcessorService — 文档解析与分块服务
 *
 * 支持的文件类型：PDF、Markdown、纯文本
 * 处理流程：提取文本 → 分块 → 返回 chunks
 */
export class DocumentProcessorService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '。', '.', '！', '？', ';', '；', ' ', ''],
    });
  }

  /**
   * 处理上传的文件：提取文本 → 分块
   *
   * @param buffer 文件内容 Buffer
   * @param fileName 原始文件名
   * @param mimeType 文件 MIME 类型
   * @returns 分块后的文本数组
   */
  async processUpload(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<TextChunk[]> {
    // 1. 提取原始文本
    const rawText = await this.extractText(buffer, mimeType, fileName);

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('无法从文件中提取文本内容');
    }

    // 2. 文本分块
    const chunks = await this.splitter.createDocuments(
      [rawText],
      [{ source: fileName }]
    );

    // 3. 转换为我们的数据结构
    return chunks.map((chunk, index) => ({
      content: chunk.pageContent,
      metadata: {
        chunkIndex: index,
        pageNumber: (chunk.metadata as any)?.loc?.lines?.from
          ? Math.floor((chunk.metadata as any).loc.lines.from / 40) + 1
          : undefined,
        startLine: (chunk.metadata as any)?.loc?.lines?.from,
      },
    }));
  }

  /**
   * 根据 MIME 类型提取文件文本
   */
  private async extractText(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<string> {
    // PDF 文件
    if (
      mimeType === 'application/pdf' ||
      fileName.toLowerCase().endsWith('.pdf')
    ) {
      const data = await pdfParse(buffer);
      return data.text;
    }

    // Markdown 文件
    if (
      mimeType === 'text/markdown' ||
      fileName.toLowerCase().endsWith('.md')
    ) {
      return buffer.toString('utf-8');
    }

    // 纯文本文件
    if (
      mimeType === 'text/plain' ||
      fileName.toLowerCase().endsWith('.txt')
    ) {
      return buffer.toString('utf-8');
    }

    // 尝试作为 UTF-8 文本读取（兜底策略）
    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }

    throw new Error(
      `不支持的文件格式: ${mimeType}。支持的格式: PDF, Markdown, TXT`
    );
  }

  /**
   * 根据文件扩展名推断 MIME 类型
   */
  static inferFileType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'txt':
        return 'txt';
      default:
        return ext || 'unknown';
    }
  }
}

export const documentProcessorService = new DocumentProcessorService();
