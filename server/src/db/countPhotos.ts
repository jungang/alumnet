import { pool } from '../config/database';

async function countPhotos() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(a.photo_url) as with_photos
      FROM alumni_system.distinguished_alumni da
      JOIN alumni_system.alumni a ON da.alumni_id = a.id
    `);
    
    console.log('Distinguished Alumni Photo Count:');
    console.log('Total:', result.rows[0].total);
    console.log('With Photos:', result.rows[0].with_photos);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

countPhotos();
