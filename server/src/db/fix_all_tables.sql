-- 修复缺失的数据库表

-- 1. 创建状元榜表
CREATE TABLE IF NOT EXISTS alumni_system.top_scholars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    exam_year INTEGER NOT NULL,
    rank_description VARCHAR(200),
    university VARCHAR(200),
    major VARCHAR(200),
    score NUMERIC(5,2),
    photo_url TEXT,
    biography TEXT,
    alumni_id UUID,
    sort_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建知识库表
CREATE TABLE IF NOT EXISTS alumni_system.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    source VARCHAR(500),
    embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建消息分类表（如果互动统计需要）
CREATE TABLE IF NOT EXISTS alumni_system.message_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 插入测试数据
INSERT INTO alumni_system.top_scholars (name, exam_year, rank_description, university, major, score, sort_order) VALUES
('张明', 2023, '理科状元', '清华大学', '计算机科学', 698.5, 1),
('李华', 2022, '文科状元', '北京大学', '法学', 685.0, 2),
('王芳', 2021, '理科状元', '复旦大学', '经济学', 692.0, 3)
ON CONFLICT DO NOTHING;

INSERT INTO alumni_system.knowledge_base (title, content, category, source) VALUES
('校友录使用指南', '欢迎使用校友录系统，本系统提供校友信息查询、毕业照浏览、留言互动等功能。', '帮助文档', '系统'),
('学校历史简介', '学校成立于1950年，经过多年发展，已成为国内一流的综合性大学。', '校史资料', '档案室'),
('校友捐赠 FAQ', '如何进行捐赠？捐赠款项用途？捐赠人权益说明。', '常见问题', '基金会')
ON CONFLICT DO NOTHING;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_top_scholars_exam_year ON alumni_system.top_scholars(exam_year DESC);
CREATE INDEX IF NOT EXISTS idx_top_scholars_is_deleted ON alumni_system.top_scholars(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON alumni_system.knowledge_base(category);

-- 6. 检查并修复 messages 表的 reviewed_at 字段（互动统计需要）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'alumni_system' 
                   AND table_name = 'messages' 
                   AND column_name = 'reviewed_at') THEN
        ALTER TABLE alumni_system.messages ADD COLUMN reviewed_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'alumni_system' 
                   AND table_name = 'video_greetings' 
                   AND column_name = 'reviewed_at') THEN
        ALTER TABLE alumni_system.video_greetings ADD COLUMN reviewed_at TIMESTAMP;
    END IF;
END $$;
