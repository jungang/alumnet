import { pool } from '../config/database';

async function checkSchemas() {
  try {
    // 查询所有可用的 schema
    const schemasResult = await pool.query(`
      SELECT schema_name, 
             has_schema_privilege(schema_name, 'CREATE') as can_create,
             has_schema_privilege(schema_name, 'USAGE') as can_use
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log('可用的 Schema:');
    schemasResult.rows.forEach(row => {
      console.log(`  ${row.schema_name}: CREATE=${row.can_create}, USAGE=${row.can_use}`);
    });

    // 尝试创建自己的 schema
    console.log('\n尝试创建 alumni_system schema...');
    try {
      await pool.query('CREATE SCHEMA IF NOT EXISTS alumni_system');
      console.log('  成功创建 alumni_system schema!');
      
      // 检查新 schema 的权限
      const newSchemaPriv = await pool.query(`
        SELECT has_schema_privilege('alumni_system', 'CREATE') as can_create
      `);
      console.log('  alumni_system CREATE权限:', newSchemaPriv.rows[0].can_create);
    } catch (err: any) {
      console.log('  创建 schema 失败:', err.message);
    }

    // 检查是否可以直接在当前用户的默认 schema 创建表
    console.log('\n检查当前 search_path:');
    const pathResult = await pool.query('SHOW search_path');
    console.log('  search_path:', pathResult.rows[0].search_path);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkSchemas();
