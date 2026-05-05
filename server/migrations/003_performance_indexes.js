/**
 * 迁移 003: 性能索引优化
 * pg_trgm GIN 索引 + 复合索引 + 慢查询日志
 * @eslint
 * global exports, pgm
 */
/* eslint no-undef: "off" */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // pg_trgm GIN 索引 (支持 ILIKE 查询)
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_name_trgm ON alumni_system.alumni USING gin (name gin_trgm_ops)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_phone_trgm ON alumni_system.alumni USING gin (phone gin_trgm_ops)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_email_trgm ON alumni_system.alumni USING gin (email gin_trgm_ops)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_extra_info_gin ON alumni_system.alumni USING gin (extra_info)`);

  // 复合索引
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_industry_class ON alumni_system.alumni (industry, class_name)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_year_industry ON alumni_system.alumni (graduation_year, industry)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_alumni_class_year ON alumni_system.alumni (class_name, graduation_year)`);
};

exports.down = async (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_name_trgm`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_phone_trgm`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_email_trgm`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_extra_info_gin`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_industry_class`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_year_industry`);
  pgm.sql(`DROP INDEX IF EXISTS idx_alumni_class_year`);
};
