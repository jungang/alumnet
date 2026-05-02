-- Migration: 002_time_corridor_tables
-- Description: Create tables for Time Corridor enhancement (vintage items, class rosters)
-- Date: 2024-12-16

SET search_path TO alumni_system, public;

-- 老物件表 (Vintage Items)
CREATE TABLE IF NOT EXISTS vintage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('admission_notice', 'diploma', 'badge', 'meal_ticket', 'textbook', 'photo', 'certificate', 'other')),
    era VARCHAR(50),
    description TEXT,
    images JSONB DEFAULT '[]',
    sort_order INT DEFAULT 0,
    donor_name VARCHAR(100),
    donor_class VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 班级名录表 (Class Rosters)
CREATE TABLE IF NOT EXISTS class_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name VARCHAR(100) NOT NULL,
    graduation_year INT NOT NULL,
    head_teacher VARCHAR(100),
    student_count INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 班级-毕业照关联表 (Class-Photo Links)
CREATE TABLE IF NOT EXISTS class_photo_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES class_rosters(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES graduation_photos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, photo_id)
);

-- 班级学生表 (Class Students)
CREATE TABLE IF NOT EXISTS class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES class_rosters(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50),
    alumni_id UUID REFERENCES alumni(id) ON DELETE SET NULL,
    seat_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vintage_items_type ON vintage_items(item_type);
CREATE INDEX IF NOT EXISTS idx_vintage_items_era ON vintage_items(era);
CREATE INDEX IF NOT EXISTS idx_vintage_items_sort ON vintage_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_class_rosters_year ON class_rosters(graduation_year);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_alumni ON class_students(alumni_id);
CREATE INDEX IF NOT EXISTS idx_class_photo_links_class ON class_photo_links(class_id);
CREATE INDEX IF NOT EXISTS idx_class_photo_links_photo ON class_photo_links(photo_id);

-- 添加注释
COMMENT ON TABLE vintage_items IS '老物件数字馆 - 存储录取通知书、毕业证、校徽等历史物品';
COMMENT ON TABLE class_rosters IS '班级名录墙 - 存储班级基本信息';
COMMENT ON TABLE class_photo_links IS '班级与毕业照的关联关系';
COMMENT ON TABLE class_students IS '班级学生名单';

COMMENT ON COLUMN vintage_items.item_type IS '物品类型: admission_notice(录取通知书), diploma(毕业证), badge(校徽), meal_ticket(饭票), textbook(课本), photo(老照片), certificate(证书), other(其他)';
COMMENT ON COLUMN vintage_items.images IS 'JSON数组，存储多张图片URL';
COMMENT ON COLUMN vintage_items.sort_order IS '排序权重，数值越小越靠前';
