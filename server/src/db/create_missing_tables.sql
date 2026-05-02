-- Create missing tables for top-scholars and knowledge-base

-- 1. Create top_scholars table
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

-- 2. Create knowledge_base table with category column
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

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_top_scholars_exam_year ON alumni_system.top_scholars(exam_year DESC);
CREATE INDEX IF NOT EXISTS idx_top_scholars_is_deleted ON alumni_system.top_scholars(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON alumni_system.knowledge_base(category);

-- 4. Insert test data for top_scholars
INSERT INTO alumni_system.top_scholars (name, exam_year, rank_description, university, major, score, sort_order) VALUES
('张明', 2023, '理科状元', '清华大学', '计算机科学', 698.5, 1),
('李华', 2022, '文科状元', '北京大学', '法学', 685.0, 2),
('王芳', 2021, '理科状元', '复旦大学', '经济学', 692.0, 3)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert test data for knowledge_base
INSERT INTO alumni_system.knowledge_base (title, content, category, source) VALUES
('校友录使用指南', '欢迎使用校友录系统，本系统提供校友信息查询、毕业照浏览、留言互动等功能。', '帮助文档', '系统'),
('学校历史简介', '学校成立于1950年，经过多年发展，已成为国内一流的综合性大学。', '校史资料', '档案室'),
('校友捐赠 FAQ', '如何进行捐赠？捐赠款项用途？捐赠人权益说明。', '常见问题', '基金会')
ON CONFLICT (id) DO NOTHING;
