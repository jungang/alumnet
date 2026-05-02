/**
 * 知识库数据导入脚本
 * 将 docs 目录下的资料导入到 Qdrant 向量数据库
 */

import * as fs from 'fs';
import * as path from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 配置
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || 'http://localhost:55555';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'bge-m3';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'alumni_knowledge';
const VECTOR_SIZE = 1024;

// Qdrant客户端
const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 获取BGE Embedding
async function getEmbedding(text: string): Promise<number[]> {
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
    throw new Error(`Embedding API错误: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// 添加内容到知识库
async function addToKnowledge(content: string, metadata: Record<string, any>): Promise<string> {
  const embedding = await getEmbedding(content);
  const id = generateUUID();
  
  await qdrant.upsert(QDRANT_COLLECTION, {
    wait: true,
    points: [{
      id,
      vector: embedding,
      payload: { 
        content: content.substring(0, 10000), 
        ...metadata, 
        createdAt: new Date().toISOString() 
      },
    }],
  });
  
  return id;
}

// 将长文本分割成段落
function splitIntoChunks(text: string, maxLength: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// 解析桃李厅校友信息
function parseTaoliAlumni(content: string): Array<{name: string, content: string}> {
  const alumni: Array<{name: string, content: string}> = [];
  const sections = content.split(/^# \d+\./m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.trim().split('\n');
    const nameMatch = lines[0].match(/^(.+?)$/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      // 移除图片标记，保留文字内容
      const cleanContent = section.replace(/!\[.*?\]\(.*?\)/g, '').trim();
      if (cleanContent.length > 10) {
        alumni.push({ name, content: cleanContent });
      }
    }
  }
  
  return alumni;
}

// 主导入函数
async function importKnowledge() {
  console.log('🚀 开始导入知识库数据...\n');
  console.log(`Embedding服务: ${EMBEDDING_BASE_URL}`);
  console.log(`Qdrant服务: ${QDRANT_URL}`);
  console.log(`集合名称: ${QDRANT_COLLECTION}\n`);

  // 确保集合存在
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);
    
    if (!exists) {
      await qdrant.createCollection(QDRANT_COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      console.log(`✅ 创建集合: ${QDRANT_COLLECTION}`);
    }
  } catch (error) {
    console.error('❌ Qdrant连接失败:', error);
    process.exit(1);
  }

  let totalImported = 0;
  const docsPath = path.join(__dirname, '../../../docs');

  // 1. 导入学校简介和历史
  console.log('\n📚 导入学校简介...');
  const schoolIntro = `
示例学校简介

示例学校是一所承载着深厚历史底蕴与光荣革命传统的名校，创建于1917年，至今已有百余年历史。

学校位于吉林省，坐落于巍巍青山下，悠悠江水畔，山长水阔，钟灵毓秀。

百年来，学校秉承"德才兼备"的校训，培养了大批杰出人才，包括：
- 著名科学家（1927-1930年就读）
- "两弹一星"功勋科学家
- 东北抗日联军创建人
- 中国科学院院士
- 以及众多在政界、商界、学术界、文艺界取得卓越成就的校友

学校官网：https://www.example.edu

 一百年，岁月如歌；一百年，杏坛树人。
 巍巍青山，悠悠江水，山长水阔，钟灵毓秀；
 孜孜育人师，莘莘俊学子，硕果累累，桃李芬芳。
 十秩风雨，英才荟萃；薪火相传，青蓝相继。
 披荆斩棘，走向神州大地；乘风破浪，奔赴五湖四海。
 "德才"以兼济天下，"兼备"而誉满八方。
`;

  try {
    await addToKnowledge(schoolIntro, { 
      title: '示例学校简介', 
      type: 'school_intro',
      category: '学校概况'
    });
    totalImported++;
    console.log('  ✅ 学校简介');
  } catch (error) {
    console.error('  ❌ 学校简介导入失败:', error);
  }

  // 2. 导入桃李厅序言
  console.log('\n📚 导入桃李厅序言...');
  const taoliPreface = `
桃李厅序言

一百年，岁月如歌；一百年，杏坛树人。

巍巍九龙山，悠悠松江水，山长水阔，钟灵毓秀；孜孜育人师，莘莘俊学子，硕果累累，桃李芬芳。

十秩风雨，英才荟萃；薪火相传，青蓝相继。披荆斩棘，走向神州大地；乘风破浪，奔赴五湖四海。"达材"以兼济天下，"成德"而誉满八方。

百年风雨，百年沧桑，创世纪辉煌；赖济济时贤，桃李芬芳溢四海。

百年耕耘，百年收获，建千秋伟业；有殷殷学子，群星灿烂遍九州。
`;

  try {
    await addToKnowledge(taoliPreface, { 
      title: '桃李厅序言', 
      type: 'preface',
      category: '桃李厅'
    });
    totalImported++;
    console.log('  ✅ 桃李厅序言');
  } catch (error) {
    console.error('  ❌ 桃李厅序言导入失败:', error);
  }

  // 3. 导入桃李厅杰出校友资料
  console.log('\n📚 导入桃李厅杰出校友资料...');
  const taoliPath = path.join(docsPath, '资料/桃李厅.doc-4f83f32c-9645-4c1d-a4cd-3d71d4686d10/full.md');
  
  if (fs.existsSync(taoliPath)) {
    const taoliContent = fs.readFileSync(taoliPath, 'utf-8');
    const alumni = parseTaoliAlumni(taoliContent);
    
    for (const alumnus of alumni) {
      try {
        await addToKnowledge(alumnus.content, {
          title: `杰出校友：${alumnus.name}`,
          type: 'distinguished_alumni',
          category: '桃李厅',
          alumniName: alumnus.name
        });
        totalImported++;
        console.log(`  ✅ ${alumnus.name}`);
        // 添加延迟避免请求过快
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`  ❌ ${alumnus.name} 导入失败:`, error);
      }
    }
  } else {
    console.log('  ⚠️ 桃李厅资料文件不存在');
  }

  // 4. 导入状元榜资料
  console.log('\n📚 导入状元榜资料...');
  const zhuangyuanPath = path.join(docsPath, '资料/状元文字.doc-b2019c73-1a67-4330-9c76-1ff42bb078c5/full.md');
  
  if (fs.existsSync(zhuangyuanPath)) {
    const zhuangyuanContent = fs.readFileSync(zhuangyuanPath, 'utf-8');
    
    // 整体导入状元榜
    const zhuangyuanIntro = `
示例学校高考状元榜

示例学校历年来培养了众多高考状元，在吉林地区乃至全省名列前茅：

${zhuangyuanContent}

这些优秀学子是示例学校教育成果的杰出代表，他们考入北京大学、清华大学、中国人民大学、中国政法大学等顶尖学府，在各自领域取得了卓越成就。
`;
    
    try {
      await addToKnowledge(zhuangyuanIntro, {
        title: '示例学校高考状元榜',
        type: 'top_scholars',
        category: '状元榜'
      });
      totalImported++;
      console.log('  ✅ 状元榜总览');
    } catch (error) {
      console.error('  ❌ 状元榜导入失败:', error);
    }
  }

  // 5. 导入系统功能说明
  console.log('\n📚 导入系统功能说明...');
  const funcPath = path.join(docsPath, '触控一体机功能说明.md');
  
  if (fs.existsSync(funcPath)) {
    const funcContent = fs.readFileSync(funcPath, 'utf-8');
    const chunks = splitIntoChunks(funcContent, 3000);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        await addToKnowledge(chunks[i], {
          title: `校史馆智能系统功能说明 (${i + 1}/${chunks.length})`,
          type: 'system_doc',
          category: '系统文档'
        });
        totalImported++;
        console.log(`  ✅ 功能说明 第${i + 1}部分`);
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`  ❌ 功能说明 第${i + 1}部分 导入失败:`, error);
      }
    }
  }

  // 6. 导入需求文档
  console.log('\n📚 导入需求文档...');
  const reqPath = path.join(docsPath, '校友查询系统需求.md');
  
  if (fs.existsSync(reqPath)) {
    const reqContent = fs.readFileSync(reqPath, 'utf-8');
    
    try {
      await addToKnowledge(reqContent, {
        title: '校史馆校友查询系统需求',
        type: 'requirements',
        category: '系统文档'
      });
      totalImported++;
      console.log('  ✅ 需求文档');
    } catch (error) {
      console.error('  ❌ 需求文档导入失败:', error);
    }
  }

  // 统计结果
  console.log('\n' + '='.repeat(50));
  console.log(`✅ 知识库导入完成！共导入 ${totalImported} 条记录`);
  
  // 验证导入结果
  try {
    const info = await qdrant.getCollection(QDRANT_COLLECTION);
    console.log(`📊 集合状态: ${info.status}`);
    console.log(`📊 向量数量: ${info.points_count}`);
  } catch (error) {
    console.error('获取集合信息失败:', error);
  }
}

// 运行
importKnowledge().catch(console.error);
