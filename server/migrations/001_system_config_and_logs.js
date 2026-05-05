/**
 * 迁移 001: 添加 system_config 表 + RAG 配置项
 * 
 * 这是增量迁移的种子。现有的 init.sql 负责全量初始化，
 * 增量迁移从这里开始，记录后续 schema 变更。
 * @eslint
 * global exports, pgm
 */
/* eslint no-undef: "off" */

exports.up = (pgm) => {
  // system_config 表可能已存在（init.sql），用 IF NOT EXISTS 安全处理
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS alumni_system.system_config (
      config_key VARCHAR(100) PRIMARY KEY,
      config_value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 插入默认配置
  pgm.sql(`
    INSERT INTO alumni_system.system_config (config_key, config_value, description)
    VALUES 
      ('school_name', '育文中学', '学校名称'),
      ('school_since', '1952', '建校年份'),
      ('school_motto', '求真务实 追求卓越', '校训'),
      ('rag_system_prompt', 'You are a helpful assistant for yuwen alumni.', 'AI 人设')
    ON CONFLICT (config_key) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('system_config');
};
