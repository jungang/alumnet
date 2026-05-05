/**
 * 迁移 005: 推荐系统性能索引
 * 针对校友推荐功能添加的专用索引
 *
 * 性能优化说明：
 * 1. 同班推荐索引：class_name + id，用于快速查找同班同学
 * 2. 同行业推荐索引：industry + graduation_year + id，支持按年份过滤的行业推荐
 * 3. 同城市推荐索引：current_city + id，用于地理位置推荐
 * 4. 全文搜索GIN索引：增强姓名、学号、班级的搜索能力
 * @eslint
 * global exports, pgm
 */
/* eslint no-undef: "off" */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 同班推荐索引: class_name + id
  // 用于快速查找同班同学（排除自己）
  pgm.sql(
    `CREATE INDEX IF NOT EXISTS idx_alumni_class_recommend ON alumni_system.alumni (class_name, id)`
  );

  // 同行业推荐索引: industry + graduation_year + id
  // 用于同行业推荐（可选按年份过滤）
  pgm.sql(
    `CREATE INDEX IF NOT EXISTS idx_alumni_industry_recommend ON alumni_system.alumni (industry, graduation_year, id)` +
      ` WHERE industry IS NOT NULL`
  );

  // 同城市推荐索引: current_city + id
  // 用于地理位置推荐
  pgm.sql(
    `CREATE INDEX IF NOT EXISTS idx_alumni_city_recommend ON alumni_system.alumni (current_city, id)` +
      ` WHERE current_city IS NOT NULL`
  );

  // 活跃度排序索引: 综合活跃度相关字段
  // 可用于排序活跃校友（ futuro 优化）
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_activity_score ON alumni_system.alumni (id)`);

  // 补充：增强搜索的全文索引（用于综合搜索）
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_search_gin ON alumni_system.alumni USING gin ( 
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(student_id, '') || ' ' || coalesce(class_name, ''))
  )`);
};

exports.down = async (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_class_recommend`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_industry_recommend`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_city_recommend`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_activity_score`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_search_gin`);
};
