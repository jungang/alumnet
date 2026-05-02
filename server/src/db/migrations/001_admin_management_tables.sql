-- 后台管理功能补全 - 数据库迁移脚本
-- Migration: 001_admin_management_tables
-- Date: 2024-12-16
-- Description: 添加捐赠项目、校友会、校友动态、系统配置表，增强用户表

-- 使用 alumni_system schema
SET search_path TO alumni_system, public;

-- ============================================
-- 1. 捐赠项目表 (donation_projects)
-- ============================================
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

-- 为现有的 donations 表添加 project_id 外键关联（如果尚未存在）
-- 注意：原表 project_id 是 VARCHAR，需要修改为 UUID 以建立外键
ALTER TABLE donations 
    ALTER COLUMN project_id TYPE UUID USING project_id::uuid;

ALTER TABLE donations 
    ADD CONSTRAINT fk_donations_project 
    FOREIGN KEY (project_id) REFERENCES donation_projects(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_donation_projects_status ON donation_projects(status);

-- ============================================
-- 2. 校友会表 (alumni_associations)
-- ============================================
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alumni_associations_city ON alumni_associations(city);
CREATE INDEX IF NOT EXISTS idx_alumni_associations_region ON alumni_associations(region);

-- ============================================
-- 3. 校友动态表 (alumni_news)
-- ============================================
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alumni_news_status ON alumni_news(status);
CREATE INDEX IF NOT EXISTS idx_alumni_news_type ON alumni_news(news_type);
CREATE INDEX IF NOT EXISTS idx_alumni_news_publish_date ON alumni_news(publish_date);
CREATE INDEX IF NOT EXISTS idx_alumni_news_alumni_id ON alumni_news(alumni_id);

-- ============================================
-- 4. 系统配置表 (system_config)
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
    description VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
    ('screensaver_timeout', '300', 'number', '屏保超时时间（秒）'),
    ('rag_retrieval_count', '5', 'number', 'RAG检索返回数量'),
    ('rag_max_response_length', '500', 'number', 'AI回答最大长度'),
    ('site_title', '校友查询系统', 'string', '系统标题'),
    ('welcome_message', '欢迎来到校史馆校友查询系统', 'string', '欢迎语')
ON CONFLICT (config_key) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- ============================================
-- 5. 增强用户表 (users) - 添加缺失字段
-- ============================================
-- 添加 display_name 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- 添加 status 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'disabled'));

-- 添加 last_login_at 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- ============================================
-- 6. 增强留言表 (messages) - 添加审核相关字段
-- ============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- ============================================
-- 7. 增强校友表 (alumni) - 确保 photo_url 字段存在
-- ============================================
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为新表创建更新时间触发器
DROP TRIGGER IF EXISTS update_donation_projects_updated_at ON donation_projects;
CREATE TRIGGER update_donation_projects_updated_at
    BEFORE UPDATE ON donation_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumni_associations_updated_at ON alumni_associations;
CREATE TRIGGER update_alumni_associations_updated_at
    BEFORE UPDATE ON alumni_associations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumni_news_updated_at ON alumni_news;
CREATE TRIGGER update_alumni_news_updated_at
    BEFORE UPDATE ON alumni_news
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
