import { pool } from '../config/database';

async function checkTables() {
  try {
    // 查询当前用户
    const userResult = await pool.query('SELECT current_user, current_database()');
    console.log('当前用户:', userResult.rows[0]);

    // 查询所有表
    const tablesResult = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    
    console.log('\n数据库中的表:');
    if (tablesResult.rows.length === 0) {
      console.log('  (无表)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  ${row.table_schema}.${row.table_name}`);
      });
    }

    // 查询用户权限
    const privResult = await pool.query(`
      SELECT has_schema_privilege('public', 'CREATE') as can_create
    `);
    console.log('\n权限检查:');
    console.log('  可以在public schema创建表:', privResult.rows[0].can_create);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
