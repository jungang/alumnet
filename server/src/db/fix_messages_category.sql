-- 修复messages表缺少category字段
ALTER TABLE alumni_system.messages 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'school' CHECK (category IN ('school', 'teacher', 'classmate'));

-- 为现有数据设置默认分类
UPDATE alumni_system.messages 
SET category = 'school' 
WHERE category IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_category ON alumni_system.messages(category);
