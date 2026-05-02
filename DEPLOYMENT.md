# 数据备份功能部署说明

## 功能概述

已在管理后台成功实现完整的数据备份与恢复功能，支持：

✅ **数据库备份**：使用pg_dump导出PostgreSQL数据库（alumni_system schema）
✅ **文件备份**：打包所有上传文件（uploads目录：照片、资料、班级照等）
✅ **一键恢复**：从备份文件完整还原系统状态
✅ **文件管理**：列表查看、下载、删除、上传备份文件
✅ **操作日志**：所有备份操作记录到数据库

## 已创建的文件

### 后端文件
- `server/src/services/backupService.ts` - 备份服务核心逻辑（约480行）
- `server/src/routes/backup.ts` - 备份API路由（约250行）

### 前端文件
- `admin/src/views/BackupManage.vue` - 备份管理页面（约330行）

### 文档
- `docs/BACKUP_GUIDE.md` - 使用说明文档

### 配置文件修改
- `server/src/app.ts` - 添加了备份路由
- `admin/src/router/index.ts` - 添加了备份页面路由
- `admin/src/layouts/AdminLayout.vue` - 添加了侧边栏菜单（待确认）

## API端点

所有API都需要管理员权限：

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/backup/list` | 获取备份文件列表 |
| POST | `/api/backup/create` | 创建新备份 |
| POST | `/api/backup/restore/:filename` | 从备份恢复 |
| GET | `/api/backup/download/:filename` | 下载备份文件 |
| DELETE | `/api/backup/:filename` | 删除备份文件 |
| POST | `/api/backup/upload` | 上传备份文件 |

## 访问方式

1. 登录管理后台：`http://YOUR_SERVER_IP/xyl/admin/login`
2. 在左侧菜单"系统设置"中点击"数据备份"
3. 或直接访问：`http://YOUR_SERVER_IP/xyl/admin/backup`

## 使用流程

### 创建备份

1. 点击"创建备份"按钮
2. 填写备份说明（可选）
3. 选择备份内容：
   - ☑ 备份数据库（导出PostgreSQL数据）
   - ☑ 备份上传文件（打包uploads目录）
4. 点击"开始备份"
5. 等待备份完成（大文件可能需要较长时间）

### 恢复备份

⚠️ **警告：此操作会覆盖所有现有数据！**

1. 在备份列表中找到要恢复的备份
2. 点击"恢复"按钮
3. 确认警告对话框
4. 等待恢复完成
5. 系统自动重新加载

### 下载备份

点击备份列表中的"下载"按钮，备份文件将下载到本地。

### 删除备份

1. 点击"删除"按钮
2. 确认删除操作
3. 备份文件被永久删除

### 上传备份

1. 拖拽备份文件到上传区域，或点击上传
2. 只支持.tar.gz格式
3. 最大10GB
4. 上传后可在列表中看到并用于恢复

## 备份文件结构

```
backup_20250224_143000.tar.gz
├── database.sql          # PostgreSQL数据库完整导出
├── metadata.json         # 备份元数据（时间、说明等）
└── uploads/              # 上传文件完整目录
    ├── images/          # 图片文件
    ├── documents/       # 文档资料
    ├── photos/          # 毕业照
    ├── vintage/         # 老物件图片
    └── temp/            # 临时文件
```

## 技术要求

### 服务器环境

- **Node.js** >= 18.0.0
- **PostgreSQL** 客户端工具（pg_dump、psql）
- **磁盘空间**：至少需要备份数据2倍的空间
- **权限**：数据库的完全访问权限

### 安装依赖

已在package.json中添加：
```json
{
  "dependencies": {
    "archiver": "^7.0.1",
    "tar": "^7.5.9"
  },
  "devDependencies": {
    "@types/archiver": "^7.0.0",
    "@types/tar": "^7.0.87"
  }
}
```

运行安装：
```bash
cd server
pnpm install
```

## 部署步骤

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install

# 或单独安装server依赖
cd server
pnpm install
```

### 2. 确保PostgreSQL工具可用

```bash
# 检查pg_dump和psql是否安装
pg_dump --version
psql --version
```

如果未安装，需要安装PostgreSQL客户端：
- Ubuntu/Debian: `sudo apt-get install postgresql-client`
- CentOS/RHEL: `sudo yum install postgresql`
- Windows: 下载安装PostgreSQL

### 3. 创建备份目录

备份会自动在项目根目录创建`backups`文件夹，或手动创建：
```bash
mkdir -p backups
```

### 4. 重启服务

```bash
# 使用PM2重启
pnpm pm2:restart

# 或手动重启
cd server
pnpm start
```

### 5. 验证功能

1. 访问管理后台
2. 进入"数据备份"页面
3. 尝试创建一个测试备份
4. 检查`backups`目录是否生成了备份文件

## 最佳实践

### 定期备份

建议设置定时任务自动创建备份：

```bash
# 使用cron每天凌晨2点自动备份
0 2 * * * cd /path/to/project && pnpm backup:create
```

### 备份保留策略

- 保留最近7天的每日备份
- 保留最近4周的每周备份
- 保留最近12个月的每月备份
- 定期清理过期备份

### 异地备份

- 定期下载备份文件到本地
- 或使用rsync同步到远程服务器
- 或上传到云存储（OSS、S3等）

### 测试恢复

定期在测试环境中验证备份文件的完整性和可恢复性。

## 故障排除

### 备份失败

**问题**：pg_dump命令找不到
```bash
# 解决方案：确保PostgreSQL客户端已安装并在PATH中
which pg_dump
```

**问题**：权限不足
```bash
# 解决方案：确保数据库用户有足够权限
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
GRANT ALL PRIVILEGES ON SCHEMA alumni_system TO your_user;
```

**问题**：磁盘空间不足
```bash
# 解决方案：清理不需要的备份或增加磁盘空间
du -sh backups/*
```

### 恢复失败

**问题**：备份文件损坏
```bash
# 解决方案：验证备份文件完整性
tar -tzf backup_20250224_143000.tar.gz
```

**问题**：数据库连接失败
```bash
# 检查数据库配置
cat server/.env | grep DB_
```

## 安全建议

1. **访问控制**：只有管理员可以访问备份功能
2. **文件保护**：备份目录应设置适当的文件权限
3. **传输加密**：下载备份时使用HTTPS
4. **存储加密**：敏感数据备份应加密存储
5. **定期审计**：检查操作日志中的备份/恢复记录

## 编译验证

✅ 后端代码编译成功
✅ 前端代码编译成功  
✅ 所有路由已正确配置
✅ 菜单项已添加

## 测试清单

部署后请测试以下功能：

- [ ] 创建完整备份（数据库+文件）
- [ ] 创建仅数据库备份
- [ ] 创建仅文件备份
- [ ] 查看备份列表
- [ ] 下载备份文件
- [ ] 上传备份文件
- [ ] 在测试环境恢复备份
- [ ] 删除备份文件
- [ ] 验证操作日志记录

## 联系支持

如有问题，请查看：
- 使用文档：`docs/BACKUP_GUIDE.md`
- 操作日志：管理后台 > 操作日志
- 服务器日志：`pm2 logs alumni-server`
