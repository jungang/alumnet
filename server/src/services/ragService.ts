import { QdrantClient } from '@qdrant/js-client-rest';
import { pool } from '../config/database';
import { Alumni } from '../types/models';

interface RAGResponse {
  answer: string;
  relatedAlumni: Alumni[];
}

interface CachedAnswer {
  response: RAGResponse;
  timestamp: number;
}

// AI配置
const AI_PROVIDER = process.env.AI_PROVIDER || 'glm';
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

// Embedding配置
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'glm';
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'embedding-2';

// Qdrant配置
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'alumni_knowledge';
const VECTOR_SIZE = EMBEDDING_PROVIDER === 'bge' ? 1024 : 1024; // BGE-M3 和 GLM embedding-2 都是1024维

const CACHE_TTL = 1000 * 60 * 60; // 1小时缓存

export class RAGService {
  private cache: Map<string, CachedAnswer> = new Map();
  private qdrant: QdrantClient;
  private collectionReady = false;

  constructor() {
    this.qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    this.initCollection();
  }

  // 初始化Qdrant集合
  private async initCollection() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);
      
      if (!exists) {
        await this.qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log(`✅ Qdrant集合 ${QDRANT_COLLECTION} 创建成功`);
      }
      this.collectionReady = true;
      console.log(`✅ Qdrant连接成功，集合: ${QDRANT_COLLECTION}`);
    } catch (error) {
      console.warn('⚠️ Qdrant初始化失败，将使用降级模式:', error);
    }
  }

  // 生成文本向量 (支持多种Embedding服务)
  private async getEmbedding(text: string): Promise<number[]> {
    if (EMBEDDING_PROVIDER === 'bge') {
      return this.getBGEEmbedding(text);
    }
    return this.getGLMEmbedding(text);
  }

  // BGE Embedding (本地服务)
  private async getBGEEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${EMBEDDING_BASE_URL}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.substring(0, 8000),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('BGE Embedding API错误:', response.status, errText);
      throw new Error(`BGE Embedding API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // GLM Embedding (智谱API)
  private async getGLMEmbedding(text: string): Promise<number[]> {
    if (!GLM_API_KEY) {
      throw new Error('GLM API Key未配置');
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'embedding-2',
        input: text.substring(0, 8000),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('GLM Embedding API错误:', response.status, errText);
      throw new Error(`GLM Embedding API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // 生成UUID v4
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 添加内容到知识库
  async addToKnowledge(content: string, metadata: Record<string, any> = {}): Promise<string> {
    if (!this.collectionReady) {
      console.warn('Qdrant未就绪，跳过向量化');
      return 'skipped';
    }

    try {
      const embedding = await this.getEmbedding(content);
      const id = this.generateUUID(); // 使用UUID格式
      
      await this.qdrant.upsert(QDRANT_COLLECTION, {
        wait: true,
        points: [{
          id,
          vector: embedding,
          payload: { content: content.substring(0, 10000), ...metadata, createdAt: new Date().toISOString() },
        }],
      });
      
      console.log(`✅ 内容已添加到知识库: ${metadata.title || id}`);
      return id;
    } catch (error) {
      console.error('添加到知识库失败:', error);
      throw error;
    }
  }

  // 向量检索
  async searchKnowledge(query: string, limit = 5): Promise<any[]> {
    if (!this.collectionReady) {
      return [];
    }

    try {
      const queryVector = await this.getEmbedding(query);
      const results = await this.qdrant.search(QDRANT_COLLECTION, {
        vector: queryVector,
        limit,
        with_payload: true,
      });
      
      return results.map(r => ({
        score: r.score,
        content: r.payload?.content,
        ...r.payload,
      }));
    } catch (error) {
      console.warn('向量检索失败:', error);
      return [];
    }
  }

  // 生成查询哈希
  private hashQuery(query: string): string {
    return Buffer.from(query.toLowerCase().trim()).toString('base64');
  }

  // 检查缓存是否过期
  private isExpired(cached: CachedAnswer): boolean {
    return Date.now() - cached.timestamp > CACHE_TTL;
  }

  // 调用 GLM-4 Chat API
  private async glmChat(prompt: string): Promise<string> {
    if (!GLM_API_KEY) {
      throw new Error('GLM API Key未配置');
    }

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          { role: 'system', content: `你是示例中学校史馆的智能助手"校园小助手"。

【学校背景】
示例中学创建于1917年，是一所具有百年历史的名校。学校秉承"德才兼备"的校训。

【杰出校友】
学校培养了众多杰出人才，包括：
- 著名科学家（1929年就读）：中科院院士、"两弹一星"功勋科学家
- 著名抗日将领（1923-1925年就读）：东北抗日联军创建人、革命烈士
- 著名地震专家（1947年就读）：中科院院士
- 以及众多在政界、商界、学术界取得卓越成就的校友

【回答原则】
1. 优先使用校史馆知识库中的资料回答
2. 如果知识库资料不足，可以结合通用知识补充，但要区分来源
3. 对于具体校友查询，建议用户使用搜索功能
4. 保持友好、专业、简洁的语气
5. 回答控制在300字以内` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`GLM API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 调用 DeepSeek Chat API
  private async deepseekChat(prompt: string): Promise<string> {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key未配置');
    }

    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `你是示例中学校史馆的智能助手"校园小助手"。

【学校背景】
示例中学创建于1917年，是一所具有百年历史的名校。学校秉承"德才兼备"的校训。

【杰出校友】
学校培养了众多杰出人才，包括：
- 著名科学家（1929年就读）：中科院院士、"两弹一星"功勋科学家
- 著名抗日将领（1923-1925年就读）：东北抗日联军创建人、革命烈士
- 著名地震专家（1947年就读）：中科院院士
- 以及众多在政界、商界、学术界取得卓越成就的校友

【回答原则】
1. 优先使用校史馆知识库中的资料回答
2. 如果知识库资料不足，可以结合通用知识补充，但要区分来源
3. 对于具体校友查询，建议用户使用搜索功能
4. 保持友好、专业、简洁的语气
5. 回答控制在300字以内` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 统一Chat接口，支持主备切换
  async chat(prompt: string): Promise<string> {
    if (AI_PROVIDER === 'glm' && GLM_API_KEY) {
      try {
        return await this.glmChat(prompt);
      } catch (error) {
        console.warn('GLM失败，切换DeepSeek:', error);
        if (DEEPSEEK_API_KEY) return await this.deepseekChat(prompt);
        throw error;
      }
    } else if (DEEPSEEK_API_KEY) {
      try {
        return await this.deepseekChat(prompt);
      } catch (error) {
        console.warn('DeepSeek失败，切换GLM:', error);
        if (GLM_API_KEY) return await this.glmChat(prompt);
        throw error;
      }
    }
    throw new Error('未配置任何AI服务');
  }

  // 构建RAG提示词
  private buildPrompt(query: string, knowledgeResults: any[], alumni: any[]): string {
    let context = '';
    const hasKnowledge = knowledgeResults.length > 0;
    const hasAlumni = alumni.length > 0;
    
    if (hasKnowledge) {
      context += '【校史馆知识库资料】\n';
      context += knowledgeResults.map((r, i) => `${i + 1}. ${r.content?.substring(0, 800) || ''}`).join('\n\n');
      context += '\n\n';
    }
    
    if (hasAlumni) {
      context += '【数据库校友信息】\n';
      context += alumni.map(a => `- ${a.name}（${a.graduation_year}届）：${a.biography || '暂无简介'}`).join('\n');
      context += '\n\n';
    }

    // 根据是否有知识库内容，调整回答策略
    let instruction = '';
    if (hasKnowledge || hasAlumni) {
      instruction = `请优先根据以上校史馆资料回答问题。如果资料中有明确信息，请据实回答；如果资料不够详细，可以结合你的通用知识进行适当补充，但要注明哪些是来自校史馆资料，哪些是补充信息。`;
    } else {
      instruction = `校史馆知识库中暂无直接相关的资料。请根据你对示例中学的了解（该校创建于1917年，是一所百年名校，培养了多位杰出校友）来回答问题。如果问题涉及具体校友信息，建议用户使用搜索功能查询。`;
    }

    return `【用户问题】${query}

${context}【回答要求】
${instruction}
请用友好、专业的语气回答，控制在300字以内。`;
  }

  // RAG查询（核心方法）
  async query(userQuery: string): Promise<RAGResponse> {
    const cacheKey = this.hashQuery(userQuery);
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.response;
    }

    try {
      // 1. 向量检索知识库
      const knowledgeResults = await this.searchKnowledge(userQuery, 3);
      
      // 2. 数据库关键词检索校友
      let relatedAlumni: any[] = [];
      try {
        await pool.query('SET search_path TO alumni_system, public');
        const result = await pool.query(`
          SELECT id, name, graduation_year, class_name, industry, biography, extra_info
          FROM alumni 
          WHERE name ILIKE $1 OR biography ILIKE $1 OR class_name ILIKE $1 OR industry ILIKE $1
          LIMIT 5
        `, [`%${userQuery}%`]);
        relatedAlumni = result.rows;
      } catch (dbError) {
        console.warn('数据库查询失败:', dbError);
      }

      // 3. 构建提示词并调用AI
      const prompt = this.buildPrompt(userQuery, knowledgeResults, relatedAlumni);
      const answer = await this.chat(prompt);

      const response: RAGResponse = {
        answer,
        relatedAlumni: relatedAlumni.map(this.rowToAlumni),
      };
      
      this.cache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.warn('RAG服务异常，降级为关键词检索:', error);
      return this.fallbackKeywordSearch(userQuery);
    }
  }

  // 降级：关键词检索
  private async fallbackKeywordSearch(query: string): Promise<RAGResponse> {
    try {
      await pool.query('SET search_path TO alumni_system, public');
      const result = await pool.query(`
        SELECT * FROM alumni 
        WHERE name ILIKE $1 OR biography ILIKE $1 OR extra_info::text ILIKE $1
        LIMIT 10
      `, [`%${query}%`]);

      return {
        answer: '智能搜索暂时不可用，已切换到基础搜索模式。以下是匹配的校友信息：',
        relatedAlumni: result.rows.map(this.rowToAlumni),
      };
    } catch {
      return { answer: '抱歉，搜索服务暂时不可用，请稍后重试。', relatedAlumni: [] };
    }
  }

  private rowToAlumni(row: any): Alumni {
    return {
      id: row.id,
      name: row.name,
      studentId: row.student_id,
      graduationYear: row.graduation_year,
      className: row.class_name,
      industry: row.industry,
      currentCity: row.current_city,
      workUnit: row.work_unit,
      phone: row.phone,
      email: row.email,
      phoneVisibility: row.phone_visibility,
      emailVisibility: row.email_visibility,
      status: row.status,
      extraInfo: row.extra_info,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  clearCache(): void { this.cache.clear(); }
  getProvider(): string { return AI_PROVIDER; }
}

export const ragService = new RAGService();
