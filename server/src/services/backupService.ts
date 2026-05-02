import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  dbSize: number;
  fileSize: number;
  description?: string;
}

export interface BackupOptions {
  description?: string;
  includeFiles?: boolean;
  includeDatabase?: boolean;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  details?: {
    databaseRestored: boolean;
    filesRestored: boolean;
    warnings?: string[];
  };
}

/**
 * 数据备份服务
 */
class BackupService {
  private backupDir: string;
  private uploadDir: string;

  constructor() {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    this.uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    this.ensureBackupDir();
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 生成备份文件名
   */
  private generateBackupFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `backup_${year}${month}${day}_${hour}${minute}${second}.tar.gz`;
  }

  /**
   * 获取数据库连接配置
   */
  private getDbConfig(): { host: string; port: number; database: string; user: string; password: string } {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'web',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };
  }

  /**
   * 备份数据库（使用pg客户端，兼容PostgreSQL 18）
   */
  private async backupDatabaseWithClient(sqlFile: string): Promise<number> {
    const client = await pool.connect();
    
    try {
      console.log('开始使用pg客户端备份数据库...');
      
      // 创建SQL内容头部
      let sqlContent = '-- Alumni System Database Backup\n';
      sqlContent += '-- Created at: ' + new Date().toISOString() + '\n';
      sqlContent += '-- Database: ' + (process.env.DB_NAME || 'web') + '\n';
      sqlContent += '-- Schema: alumni_system\n\n';
      
      // 获取所有表
      const tablesResult = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'alumni_system' ORDER BY tablename"
      );
      
      console.log(`找到 ${tablesResult.rows.length} 个表需要备份`);
      
      // 导出每个表的数据
      for (const table of tablesResult.rows) {
        const tableName = table.tablename;
        console.log(`导出表: ${tableName}`);
        
        sqlContent += `-- Table: ${tableName}\n`;
        
        // 获取行数
        const countResult = await client.query(
          `SELECT COUNT(*) FROM alumni_system.${tableName}`
        );
        const rowCount = parseInt(countResult.rows[0].count);
        console.log(`  行数: ${rowCount}`);
        
        if (rowCount > 0) {
          // 导出数据为INSERT语句
          const dataResult = await client.query(
            `SELECT * FROM alumni_system.${tableName}`
          );
          
          for (const row of dataResult.rows) {
            const columns = Object.keys(row);
            const values = Object.values(row).map(v =>
              v === null ? 'NULL' :
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` :
              typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
              v
            );
            sqlContent += `INSERT INTO alumni_system.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          console.log(`  导出 ${dataResult.rows.length} 行数据`);
        }
        
        sqlContent += '\n';
      }
      
      // 写入文件
      fs.writeFileSync(sqlFile, sqlContent, 'utf8');
      const stats = fs.statSync(sqlFile);
      
      console.log(`数据库备份完成: ${sqlFile}`);
      console.log(`文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`表数量: ${tablesResult.rows.length}`);
      
      return stats.size;
    } catch (error: any) {
      console.error('数据库备份失败:', error);
      throw new Error(`数据库备份失败: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * 从SQL文件恢复数据库
   */
  private async restoreDatabase(sqlFile: string): Promise<void> {
    const config = this.getDbConfig();

    // 设置环境变量
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
    };

    try {
      // 先删除alumni_system schema中的所有数据
      const client = await pool.connect();
      try {
        // 获取所有表
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'alumni_system'
        `);

        // 删除所有表数据
        for (const row of tablesResult.rows) {
          await client.query(`TRUNCATE TABLE alumni_system.${row.tablename} CASCADE;`);
        }
      } finally {
        client.release();
      }

      // 使用psql恢复数据库
      const restoreCommand = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${sqlFile}"`;
      await execAsync(restoreCommand, { env });
    } catch (error: any) {
      console.error('数据库恢复失败:', error);
      throw new Error(`数据库恢复失败: ${error.message}`);
    }
  }

  /**
   * 创建完整备份
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    const {
      description = '',
      includeFiles = true,
      includeDatabase = true,
    } = options;

    const backupId = Date.now().toString();
    const filename = this.generateBackupFilename();
    const backupPath = path.join(this.backupDir, filename);
    const tempDir = path.join(this.backupDir, `temp_${backupId}`);

    try {
      // 创建临时目录
      fs.mkdirSync(tempDir, { recursive: true });

      let dbSize = 0;
      let fileSize = 0;

      // 备份数据库
      if (includeDatabase) {
        console.log('开始备份数据库...');
        const sqlFile = path.join(tempDir, 'database.sql');
        dbSize = await this.backupDatabaseWithClient(sqlFile);

        // 保存备份元数据
        const metadata = {
          id: backupId,
          filename,
          createdAt: new Date().toISOString(),
          description,
          dbSize,
          fileSize: 0, // 稍后更新
          includes: {
            database: includeDatabase,
            files: includeFiles,
          },
        };
        fs.writeFileSync(path.join(tempDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      }

      // 备份文件
      if (includeFiles && fs.existsSync(this.uploadDir)) {
        console.log('开始备份上传文件...');
        const filesTempDir = path.join(tempDir, 'uploads');
        fs.mkdirSync(filesTempDir, { recursive: true });

        // 复制uploads目录
        await this.copyDirectory(this.uploadDir, filesTempDir);
        fileSize = this.getDirectorySize(filesTempDir);
      }

      // 创建压缩包
      console.log('创建压缩包...');
      await this.createTarGz(tempDir, backupPath);

      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });

      // 获取最终文件大小
      const stats = fs.statSync(backupPath);
      const totalSize = stats.size;

      console.log(`备份完成: ${filename} (${this.formatSize(totalSize)})`);

      return {
        id: backupId,
        filename,
        createdAt: new Date().toISOString(),
        size: totalSize,
        dbSize,
        fileSize,
        description,
      };
    } catch (error: any) {
      // 清理临时文件
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      throw error;
    }
  }

  /**
   * 从备份文件恢复
   */
  async restoreFromBackup(backupFilename: string): Promise<RestoreResult> {
    const backupPath = path.join(this.backupDir, backupFilename);
    const tempDir = path.join(this.backupDir, `restore_${Date.now()}`);

    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在');
    }

    const warnings: string[] = [];
    let databaseRestored = false;
    let filesRestored = false;

    try {
      // 解压备份文件
      console.log('解压备份文件...');
      await this.extractTarGz(backupPath, tempDir);

      // 读取元数据
      const metadataFile = path.join(tempDir, 'metadata.json');
      let metadata: any = {};
      if (fs.existsSync(metadataFile)) {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
      }

      // 恢复数据库
      const sqlFile = path.join(tempDir, 'database.sql');
      if (fs.existsSync(sqlFile) && metadata.includes?.database) {
        console.log('恢复数据库...');
        await this.restoreDatabase(sqlFile);
        databaseRestored = true;
      } else {
        warnings.push('数据库备份文件不存在或未包含在备份中');
      }

      // 恢复文件
      const filesBackupDir = path.join(tempDir, 'uploads');
      if (fs.existsSync(filesBackupDir) && metadata.includes?.files) {
        console.log('恢复上传文件...');

        // 备份现有文件
        const existingBackup = path.join(this.backupDir, `uploads_before_restore_${Date.now()}`);
        if (fs.existsSync(this.uploadDir)) {
          fs.renameSync(this.uploadDir, existingBackup);
        }

        try {
          // 移动恢复的文件
          fs.renameSync(filesBackupDir, this.uploadDir);
          filesRestored = true;
        } catch (error) {
          // 如果恢复失败，恢复原有文件
          if (fs.existsSync(existingBackup)) {
            fs.renameSync(existingBackup, this.uploadDir);
          }
          throw error;
        }
      } else {
        warnings.push('文件备份不存在或未包含在备份中');
      }

      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });

      return {
        success: true,
        message: '恢复成功',
        details: {
          databaseRestored,
          filesRestored,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    } catch (error: any) {
      // 清理临时文件
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw new Error(`恢复失败: ${error.message}`);
    }
  }

  /**
   * 获取备份文件列表
   */
  async getBackupList(): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];

    if (!fs.existsSync(this.backupDir)) {
      return backups;
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.tar.gz'))
      .sort((a, b) => b.localeCompare(a)); // 按名称降序排序

    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      // 跳过空文件或损坏的备份
      if (stats.size === 0) {
        continue;
      }
      
      // 尝试从tar.gz中读取元数据
      let dbSize = 0;
      let fileSize = 0;
      let description = '';
      
      try {
        // 使用子进程执行tar命令
        const tempDir = path.join(this.backupDir, `temp_meta_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        // 使用tar命令解压metadata.json
        await execAsync(`tar -xzf "${filePath}" -C "${tempDir}" metadata.json`);
        
        const metadataPath = path.join(tempDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          dbSize = metadata.dbSize || 0;
          fileSize = metadata.fileSize || 0;
          description = metadata.description || '';
        }
        
        // 清理临时目录
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        // 如果读取元数据失败，保持默认值
        console.warn(`无法读取备份 ${file} 的元数据:`, error);
      }

      backups.push({
        id: file.replace('.tar.gz', ''),
        filename: file,
        createdAt: stats.mtime.toISOString(),
        size: stats.size,
        dbSize,
        fileSize,
        description,
      });
    }

    return backups;
  }

  /**
   * 删除备份文件
   */
  deleteBackup(filename: string): boolean {
    const filePath = path.join(this.backupDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * 获取备份文件路径
   */
  getBackupPath(filename: string): string {
    return path.join(this.backupDir, filename);
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * 获取目录大小
   */
  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    function calculateSize(filePath: string): void {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        files.forEach(file => {
          calculateSize(path.join(filePath, file));
        });
      } else {
        totalSize += stats.size;
      }
    }

    calculateSize(dirPath);
    return totalSize;
  }

  /**
   * 创建tar.gz压缩包
   */
  private async createTarGz(sourceDir: string, outputPath: string): Promise<void> {
    // 使用Node.js的archiver库
    const archiver = (await import('archiver')).default;
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 6 },
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 解压tar.gz文件
   */
  private async extractTarGz(archivePath: string, destDir: string): Promise<void> {
    const tar = require('tar');
    await tar.x({
      file: archivePath,
      cwd: destDir,
    });
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export const backupService = new BackupService();
