-- 注意: 使用PostgreSQL 13+内置的gen_random_uuid()，无需uuid-ossp扩展
-- pgvector扩展需要服务器安装，如果不可用则跳过向量功能

-- 使用 alumni_system schema（admin用户在public schema没有CREATE权限）
CREATE SCHEMA IF NOT EXISTS alumni_system;
SET search_path TO alumni_system, public;

-- 校友表（结构化数据 + 向量数据一体化）
CREATE TABLE IF NOT EXISTS alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50),
    graduation_year INT NOT NULL,
    class_name VARCHAR(100),
    industry VARCHAR(100),
    current_city VARCHAR(100),
    work_unit VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    phone_visibility VARCHAR(20) DEFAULT 'classmates_only' CHECK (phone_visibility IN ('public', 'classmates_only', 'private')),
    email_visibility VARCHAR(20) DEFAULT 'classmates_only' CHECK (email_visibility IN ('public', 'classmates_only', 'private')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'lost_contact', 'deceased')),
    biography TEXT,
    photo_url VARCHAR(500),
    -- biography_embedding vector(1536), -- 需要pgvector扩展
    extra_info JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 杰出校友表
CREATE TABLE IF NOT EXISTS distinguished_alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    achievement TEXT,
    video_url VARCHAR(500),
    popularity INT DEFAULT 0,
    timeline JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 毕业照表
CREATE TABLE IF NOT EXISTS graduation_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    class_name VARCHAR(100),
    original_url VARCHAR(500) NOT NULL,
    restored_url VARCHAR(500),
    face_tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 留言表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES alumni(id),
    author_name VARCHAR(100),
    author_class VARCHAR(100),
    content TEXT,
    handwriting_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at TIMESTAMP,
    reviewed_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 寻人启事表
CREATE TABLE IF NOT EXISTS search_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id UUID NOT NULL REFERENCES alumni(id),
    target_name VARCHAR(100) NOT NULL,
    target_class VARCHAR(100),
    description TEXT,
    story TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'found', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 隐私握手表
CREATE TABLE IF NOT EXISTS privacy_handshakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES alumni(id),
    target_id UUID NOT NULL REFERENCES alumni(id),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- 捐赠记录表
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES alumni(id),
    donor_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    project_id VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    operation_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 知识库表（RAG内容管理）
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'webpage', 'document')),
    content TEXT,
    source VARCHAR(1000),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表（管理员）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    display_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TIMESTAMP,
    alumni_id UUID REFERENCES alumni(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 捐赠项目表
CREATE TABLE IF NOT EXISTS donation_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 校友会表
CREATE TABLE IF NOT EXISTS alumni_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    wechat_qrcode VARCHAR(500),
    member_count INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 校友动态表
CREATE TABLE IF NOT EXISTS alumni_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    alumni_id UUID REFERENCES alumni(id) ON DELETE SET NULL,
    alumni_name VARCHAR(100),
    news_type VARCHAR(50) CHECK (news_type IN ('award', 'donation', 'activity', 'news')),
    publish_date DATE,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON alumni(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_class_name ON alumni(class_name);
CREATE INDEX IF NOT EXISTS idx_alumni_name ON alumni(name);
CREATE INDEX IF NOT EXISTS idx_alumni_industry ON alumni(industry);
CREATE INDEX IF NOT EXISTS idx_alumni_student_id ON alumni(student_id);
CREATE INDEX IF NOT EXISTS idx_alumni_extra_info ON alumni USING gin(extra_info);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_search_notices_status ON search_notices(status);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- 新增表索引
CREATE INDEX IF NOT EXISTS idx_donation_projects_status ON donation_projects(status);
CREATE INDEX IF NOT EXISTS idx_alumni_associations_city ON alumni_associations(city);
CREATE INDEX IF NOT EXISTS idx_alumni_associations_region ON alumni_associations(region);
CREATE INDEX IF NOT EXISTS idx_alumni_news_status ON alumni_news(status);
CREATE INDEX IF NOT EXISTS idx_alumni_news_type ON alumni_news(news_type);
CREATE INDEX IF NOT EXISTS idx_alumni_news_publish_date ON alumni_news(publish_date);
CREATE INDEX IF NOT EXISTS idx_alumni_news_alumni_id ON alumni_news(alumni_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- 向量索引（需要pgvector扩展）
-- CREATE INDEX IF NOT EXISTS idx_alumni_embedding ON alumni USING ivfflat (biography_embedding vector_cosine_ops) WITH (lists = 100);

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
    ('screensaver_timeout', '300', 'number', '屏保超时时间（秒）'),
    ('rag_retrieval_count', '5', 'number', 'RAG检索返回数量'),
    ('rag_max_response_length', '500', 'number', 'AI回答最大长度'),
    ('site_title', '校友查询系统', 'string', '系统标题'),
    ('welcome_message', '欢迎来到校史馆校友查询系统', 'string', '欢迎语')
ON CONFLICT (config_key) DO NOTHING;
