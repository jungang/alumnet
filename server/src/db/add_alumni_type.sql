-- 为校友表添加 type 字段，用于区分不同类型的校友
-- 类型包括：校友、名师、状元、革命烈士等

ALTER TABLE alumni_system.alumni
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT '校友' CHECK (type IN ('校友', '名师', '状元', '革命烈士', '政界', '学术', '商界', '文化', '医疗', '教育'));

-- 为现有数据设置默认值
UPDATE alumni_system.alumni
SET type = '校友'
WHERE type IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alumni_type ON alumni_system.alumni(type);

-- 更新部分已知校友的类型（根据毕业年份和成就推测）
-- 这里可以根据实际需求后续调整
UPDATE alumni_system.alumni
SET type = '状元'
WHERE name IN (
    SELECT a.name FROM alumni_system.alumni a
    JOIN alumni_system.distinguished_alumni da ON a.id = da.alumni_id
    WHERE da.category = '状元榜'
);

UPDATE alumni_system.alumni
SET type = '革命烈士'
WHERE name IN (
    SELECT a.name FROM alumni_system.alumni a
    JOIN alumni_system.distinguished_alumni da ON a.id = da.alumni_id
    WHERE da.category = '革命烈士'
);

-- 更新杰出校友的类型为对应的 category
UPDATE alumni_system.alumni a
SET type = da.category
FROM alumni_system.distinguished_alumni da
WHERE a.id = da.alumni_id AND da.category IN ('政界', '学术', '商界', '文化', '医疗', '教育');

SELECT '校友表 type 字段添加完成' as result;
