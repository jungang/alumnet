-- 初始化数据脚本
-- 示例学校校友查询系统

-- 使用 alumni_system schema
SET search_path TO alumni_system, public;

-- 1. 插入示例校友数据
INSERT INTO alumni (name, student_id, graduation_year, class_name, department, industry, current_city, work_unit, phone, email, biography, extra_info) VALUES
('张伟', '198501001', 1985, '高三1班', '理科', '学术', '北京', '清华大学', '13800138001', 'zhangwei@example.com', '著名物理学家，清华大学教授，长期从事量子物理研究。', '{"awards": ["国家科技进步奖", "长江学者"]}'),
('李娜', '198501002', 1985, '高三1班', '理科', '医疗', '上海', '复旦大学附属医院', '13800138002', 'lina@example.com', '知名心血管专家，主任医师，发表SCI论文50余篇。', '{"specialty": "心血管内科"}'),
('王强', '198602001', 1986, '高三2班', '文科', '商界', '深圳', '腾讯科技', '13800138003', 'wangqiang@example.com', '互联网企业高管，曾参与多个重大项目。', '{}'),
('刘芳', '198602002', 1986, '高三2班', '文科', '教育', '长春', '吉林大学', '13800138004', 'liufang@example.com', '教育学教授，博士生导师，致力于基础教育研究。', '{}'),
('陈明', '199001001', 1990, '高三1班', '理科', '科技', '杭州', '阿里巴巴', '13800138005', 'chenming@example.com', '技术专家，人工智能领域资深工程师。', '{}'),
('赵丽', '199001002', 1990, '高三1班', '理科', '艺术', '北京', '中央美术学院', '13800138006', 'zhaoli@example.com', '青年画家，作品多次在国内外展出。', '{}'),
('孙鹏', '199502001', 1995, '高三2班', '理科', '政界', '长春', '吉林省政府', '13800138007', 'sunpeng@example.com', '公务员，长期从事教育政策研究工作。', '{}'),
('周婷', '199502002', 1995, '高三2班', '文科', '商界', '上海', '字节跳动', '13800138008', 'zhouting@example.com', '产品经理，负责多款知名APP的产品设计。', '{}'),
('吴刚', '200001001', 2000, '高三1班', '理科', '学术', '美国', '斯坦福大学', '13800138009', 'wugang@example.com', '计算机科学博士，从事机器学习研究。', '{}'),
('郑雪', '200001002', 2000, '高三1班', '文科', '医疗', '广州', '中山大学附属医院', '13800138010', 'zhengxue@example.com', '神经外科医生，擅长脑肿瘤手术。', '{}'),
('黄磊', '200502001', 2005, '高三2班', '理科', '科技', '北京', '百度', '13800138011', 'huanglei@example.com', '自动驾驶技术工程师。', '{}'),
('林小红', '200502002', 2005, '高三2班', '文科', '教育', '长春', '示例中学', '13800138012', 'linxiaohong@example.com', '回到母校任教，语文高级教师。', '{}'),
('杨帆', '201001001', 2010, '高三1班', '理科', '商界', '成都', '华为技术', '13800138013', 'yangfan@example.com', '通信工程师，参与5G技术研发。', '{}'),
('徐静', '201001002', 2010, '高三1班', '文科', '艺术', '上海', '上海交响乐团', '13800138014', 'xujing@example.com', '小提琴演奏家，多次参加国际音乐节。', '{}'),
('马超', '201502001', 2015, '高三2班', '理科', '科技', '杭州', '网易', '13800138015', 'machao@example.com', '游戏开发工程师。', '{}'),
('何丽', '201502002', 2015, '高三2班', '文科', '医疗', '北京', '北京协和医院', '13800138016', 'heli@example.com', '住院医师，内科方向。', '{}'),
('罗明', '202001001', 2020, '高三1班', '理科', '学术', '长春', '吉林大学', '13800138017', 'luoming@example.com', '在读研究生，计算机专业。', '{}'),
('谢芳', '202001002', 2020, '高三1班', '文科', '教育', '长春', '东北师范大学', '13800138018', 'xiefang@example.com', '在读研究生，教育学专业。', '{}')
ON CONFLICT DO NOTHING;

-- 2. 插入杰出校友数据
INSERT INTO distinguished_alumni (alumni_id, category, achievement, video_url, popularity, timeline) 
SELECT id, '学术', '国家科技进步奖获得者，清华大学物理系教授', NULL, 100, 
  '[{"year": 1985, "title": "毕业于示例中学"}, {"year": 1989, "title": "清华大学本科毕业"}, {"year": 1995, "title": "获得博士学位"}, {"year": 2010, "title": "获国家科技进步奖"}]'::jsonb
FROM alumni WHERE name = '张伟'
ON CONFLICT DO NOTHING;

INSERT INTO distinguished_alumni (alumni_id, category, achievement, video_url, popularity, timeline)
SELECT id, '医疗', '知名心血管专家，复旦大学附属医院主任医师', NULL, 85,
  '[{"year": 1985, "title": "毕业于示例中学"}, {"year": 1991, "title": "医学博士毕业"}, {"year": 2005, "title": "晋升主任医师"}]'::jsonb
FROM alumni WHERE name = '李娜'
ON CONFLICT DO NOTHING;

INSERT INTO distinguished_alumni (alumni_id, category, achievement, video_url, popularity, timeline)
SELECT id, '商界', '互联网行业资深高管', NULL, 90,
  '[{"year": 1986, "title": "毕业于示例中学"}, {"year": 2000, "title": "加入腾讯"}, {"year": 2015, "title": "晋升副总裁"}]'::jsonb
FROM alumni WHERE name = '王强'
ON CONFLICT DO NOTHING;

INSERT INTO distinguished_alumni (alumni_id, category, achievement, video_url, popularity, timeline)
SELECT id, '艺术', '青年画家，作品被多家美术馆收藏', NULL, 75,
  '[{"year": 1990, "title": "毕业于示例中学"}, {"year": 1994, "title": "中央美院毕业"}, {"year": 2010, "title": "举办个人画展"}]'::jsonb
FROM alumni WHERE name = '赵丽'
ON CONFLICT DO NOTHING;

-- 3. 插入示例留言数据
INSERT INTO messages (author_name, author_class, content, status) VALUES
('张伟', '1985届高三1班', '感谢母校的培养，母校精神永远激励着我前行！', 'approved'),
('李娜', '1985届高三1班', '每次回到长春，都会想起在母校的美好时光。', 'approved'),
('王强', '1986届高三2班', '祝母校越办越好，桃李满天下！', 'approved'),
('匿名校友', NULL, '示例中学是我人生的起点，感恩遇见。', 'approved'),
('陈明', '1990届高三1班', '希望能有机会回母校看看，和老师们叙叙旧。', 'approved')
ON CONFLICT DO NOTHING;

-- 4. 插入示例毕业照数据
INSERT INTO graduation_photos (year, class_name, original_url, face_tags) VALUES
(1985, '高三1班', '/photos/1985_class1.jpg', '[]'::jsonb),
(1985, '高三2班', '/photos/1985_class2.jpg', '[]'::jsonb),
(1990, '高三1班', '/photos/1990_class1.jpg', '[]'::jsonb),
(1995, '高三2班', '/photos/1995_class2.jpg', '[]'::jsonb),
(2000, '高三1班', '/photos/2000_class1.jpg', '[]'::jsonb),
(2005, '高三2班', '/photos/2005_class2.jpg', '[]'::jsonb),
(2010, '高三1班', '/photos/2010_class1.jpg', '[]'::jsonb),
(2015, '高三2班', '/photos/2015_class2.jpg', '[]'::jsonb),
(2020, '高三1班', '/photos/2020_class1.jpg', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. 插入示例捐赠数据
INSERT INTO donations (donor_name, amount, project_id, message) VALUES
('张伟', 50000.00, '1', '支持校史馆建设'),
('王强', 100000.00, '1', '回馈母校'),
('李娜', 20000.00, '2', '帮助贫困学生'),
('陈明', 10000.00, '2', '助学金捐赠'),
('匿名校友', 5000.00, '3', '校园绿化')
ON CONFLICT DO NOTHING;

-- 6. 插入管理员账户
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2a$10$rQnM1.kK8LFHKxKqKqKqKuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', 'admin')
ON CONFLICT (username) DO NOTHING;
