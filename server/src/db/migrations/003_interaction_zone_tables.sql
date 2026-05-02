-- 互动寄语区功能增强 - 数据库迁移
-- Migration: 003_interaction_zone_tables.sql

SET search_path TO alumni_system, public;

-- ============================================
-- 1. 扩展 messages 表，添加分类字段
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'alumni_system' 
        AND table_name = 'messages' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE alumni_system.messages 
        ADD COLUMN category VARCHAR(20) DEFAULT 'school' 
        CHECK (category IN ('school', 'teacher', 'classmate'));
    END IF;
END $$;

-- ============================================
-- 1.5 添加 messages 表拒绝原因字段
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'alumni_system' 
        AND table_name = 'messages' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE alumni_system.messages 
        ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- ============================================
-- 2. 扩展 search_notices 表
-- ============================================
DO $$ 
BEGIN
    -- 添加联系偏好字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'alumni_system' 
        AND table_name = 'search_notices' 
        AND column_name = 'contact_preference'
    ) THEN
        ALTER TABLE alumni_system.search_notices 
        ADD COLUMN contact_preference VARCHAR(20) DEFAULT 'system'
        CHECK (contact_preference IN ('system', 'email', 'phone', 'wechat'));
    END IF;

    -- 添加重逢故事字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'alumni_system' 
        AND table_name = 'search_notices' 
        AND column_name = 'reunion_story'
    ) THEN
        ALTER TABLE alumni_system.search_notices 
        ADD COLUMN reunion_story TEXT;
    END IF;

    -- 添加最后提醒时间字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'alumni_system' 
        AND table_name = 'search_notices' 
        AND column_name = 'last_reminder_at'
    ) THEN
        ALTER TABLE alumni_system.search_notices 
        ADD COLUMN last_reminder_at TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- 3. 创建视频寄语表
-- ============================================
CREATE TABLE IF NOT EXISTS alumni_system.video_greetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES alumni_system.alumni(id) ON DELETE SET NULL,
    alumni_name VARCHAR(100) NOT NULL,
    alumni_class VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration_seconds INT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
    rejection_reason TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by UUID,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 创建内容审计日志表
-- ============================================
CREATE TABLE IF NOT EXISTS alumni_system.content_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    original_content JSONB,
    new_content JSONB,
    operator_id UUID,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_category ON alumni_system.messages(category);
CREATE INDEX IF NOT EXISTS idx_video_greetings_status ON alumni_system.video_greetings(status);
CREATE INDEX IF NOT EXISTS idx_video_greetings_alumni ON alumni_system.video_greetings(alumni_id);
CREATE INDEX IF NOT EXISTS idx_video_greetings_created ON alumni_system.video_greetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_audit_logs_content ON alumni_system.content_audit_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_audit_logs_created ON alumni_system.content_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_notices_created ON alumni_system.search_notices(created_at DESC);

-- ============================================
-- 6. 添加触发器更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION alumni_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_greetings_updated_at ON alumni_system.video_greetings;
CREATE TRIGGER update_video_greetings_updated_at
    BEFORE UPDATE ON alumni_system.video_greetings
    FOR EACH ROW
    EXECUTE FUNCTION alumni_system.update_updated_at_column();

