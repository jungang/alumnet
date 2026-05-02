-- 状元榜数据表迁移脚本
-- Migration: 004_top_scholars_table.sql
-- Description: 创建高考状元榜数据表

SET search_path TO alumni_system, public;

-- 高考状元表
CREATE TABLE IF NOT EXISTS top_scholars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    exam_year INT NOT NULL,
    rank_description VARCHAR(200) NOT NULL,  -- 如"吉林地区文科第一名"
    university VARCHAR(200),                  -- 录取院校
    major VARCHAR(200),                       -- 专业
    score INT,                                -- 高考分数（可选）
    photo_url VARCHAR(500),
    biography TEXT,
    alumni_id UUID REFERENCES alumni(id) ON DELETE SET NULL,  -- 关联校友表（可选）
    sort_order INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_top_scholars_exam_year ON top_scholars(exam_year DESC);
CREATE INDEX IF NOT EXISTS idx_top_scholars_name ON top_scholars(name);
CREATE INDEX IF NOT EXISTS idx_top_scholars_alumni_id ON top_scholars(alumni_id);
CREATE INDEX IF NOT EXISTS idx_top_scholars_is_deleted ON top_scholars(is_deleted);

-- 添加注释
COMMENT ON TABLE top_scholars IS '高考状元榜';
COMMENT ON COLUMN top_scholars.name IS '状元姓名';
COMMENT ON COLUMN top_scholars.exam_year IS '高考年份';
COMMENT ON COLUMN top_scholars.rank_description IS '排名描述，如"吉林地区文科第一名"';
COMMENT ON COLUMN top_scholars.university IS '录取院校';
COMMENT ON COLUMN top_scholars.major IS '录取专业';
COMMENT ON COLUMN top_scholars.score IS '高考分数';
COMMENT ON COLUMN top_scholars.photo_url IS '照片URL';
COMMENT ON COLUMN top_scholars.biography IS '简介';
COMMENT ON COLUMN top_scholars.alumni_id IS '关联的校友ID';
COMMENT ON COLUMN top_scholars.sort_order IS '排序权重';
COMMENT ON COLUMN top_scholars.is_deleted IS '软删除标记';
