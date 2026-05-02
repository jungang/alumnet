<div align="center">

# AlumNet

**AI 智能校史展示系统**

[简体中文](#-功能特色) | [English](#-features)

An AI-powered intelligent school history exhibition and alumni management system

> **⚠️ Disclaimer**: All alumni data in this project is fictional and for demonstration purposes only.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-42b883.svg)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)

</div>

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><b>Standby Screen</b><br/><i>静息待机页</i></td>
    <td align="center"><b>Main Navigation</b><br/><i>主导航界面</i></td>
  </tr>
  <tr>
    <td><img src="./截图/静息页.png" alt="Standby Screen" width="400"/></td>
    <td><img src="./截图/导航.png" alt="Main Navigation" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>Smart Search</b><br/><i>AI 智能查询</i></td>
    <td align="center"><b>Time Corridor</b><br/><i>时空长廊</i></td>
  </tr>
  <tr>
    <td><img src="./截图/Snipaste_2026-05-02_21-08-51.png" alt="Smart Search" width="400"/></td>
    <td><img src="./截图/Snipaste_2026-05-02_21-09-56.png" alt="Time Corridor" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>Message Board</b><br/><i>互动寄语墙</i></td>
    <td align="center"><b>Light Theme</b><br/><i>浅色主题</i></td>
  </tr>
  <tr>
    <td><img src="./截图/Snipaste_2026-05-02_21-10-13.png" alt="Message Board" width="400"/></td>
    <td><img src="./截图/Snipaste_2026-05-02_21-10-38.png" alt="Light Theme" width="400"/></td>
  </tr>
</table>

---

## ✨ Features

An AI-powered alumni management and exhibition system for school history museums, designed for touch-screen kiosks with immersive visual effects.

| Feature | Description |
|---------|-------------|
| 🖥️ **Touch-screen Kiosk** | Immersive exhibition frontend built with Vue 3 + Three.js, featuring alumni galaxy, time corridor, and more |
| 🤖 **AI Smart Search** | RAG (Retrieval-Augmented Generation) powered natural language query with GLM-4 / DeepSeek |
| 🎓 **Alumni Management** | Full CRUD operations, batch import/export, photo management with face tagging |
| ⏳ **Time Corridor** | Chronological gallery with graduation photos, vintage items, and class directories |
| 💬 **Interactive Messages** | Message board for alumni to leave greetings and memories |
| 📊 **Admin Dashboard** | Complete management backend built with Element Plus |
| 💾 **Backup & Restore** | Full database backup and restore functionality |
| 🌗 **Dark/Light Theme** | Dual theme support for different exhibition environments |

## ✨ 功能特色

基于 AI 的校史馆智能校友管理与展示系统，专为触摸屏展厅设计，提供沉浸式视觉体验。

- 🖥️ **触摸屏展厅** — 基于 Vue 3 + Three.js 的沉浸式展示界面，支持校友星图、时空走廊等 3D 视觉效果
- 🤖 **AI 智能检索** — 基于 RAG 的自然语言查询，支持 GLM-4 / DeepSeek，让校友查询更智能
- 🎓 **校友管理** — 完整的校友信息管理，支持批量导入导出、毕业照管理与人脸标注
- ⏳ **时空长廊** — 按年代浏览毕业照、老物件、班级合影，重温校园记忆
- 💬 **互动寄语** — 校友留言墙，支持写给母校、老师、同学的寄语
- 📊 **管理后台** — 基于 Element Plus 的完整后台管理系统
- 💾 **数据备份** — 一键数据库备份与恢复
- 🌗 **双主题** — 支持深色/浅色主题切换，适配不同展厅环境

---

## 🛠️ Tech Stack / 技术栈

| Component / 组件 | Technology / 技术 |
|:---|:---|
| Kiosk Frontend / 展厅前端 | Vue 3 + TypeScript + Three.js + Tailwind CSS |
| Admin Dashboard / 管理后台 | Vue 3 + TypeScript + Element Plus |
| Backend / 后端服务 | Node.js + Express + TypeScript |
| Database / 数据库 | PostgreSQL + pgvector |
| Vector DB / 向量数据库 | Qdrant |
| AI Service / AI 服务 | GLM-4 / DeepSeek API |
| Deployment / 部署 | Docker + PM2 + Nginx |

---

## 📁 Project Structure / 项目结构

```
├── client/                  # Touch-screen kiosk (Vue 3 + Three.js)
│   └── src/                 # 触控展示端
│       ├── views/           # Galaxy, TimeCorridor, Search pages
│       ├── components/      # AIChatDialog, FaceTagOverlay, etc.
│       └── composables/     # Reusable composition functions
├── admin/                   # Admin dashboard (Vue 3 + Element Plus)
│   └── src/                 # 管理后台
│       ├── views/           # Alumni, Backup, Dashboard pages
│       ├── api/             # API interface definitions
│       └── layouts/         # Admin layout
├── server/                  # Backend API (Node.js + Express)
│   └── src/                 # 后端服务
│       ├── routes/          # API routes
│       ├── services/        # Business logic (RAG, auth, backup)
│       ├── db/              # Migrations, seeds, imports
│       └── config/          # Database & app config
├── docs/                    # Documentation / 文档
├── tests/                   # E2E tests / 测试
├── 截图/                    # Screenshots / 截图
├── docker-compose.yml       # Docker Compose config
├── deploy.sh                # Deployment script
└── ecosystem.config.js      # PM2 process manager
```

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14 (with pgvector extension recommended)
- (Optional) Qdrant — for AI-powered search
- (Optional) GLM-4 or DeepSeek API Key — for AI features

### 1. Clone / 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd alumnet
```

### 2. Install / 安装依赖

```bash
pnpm install
```

### 3. Configure / 配置环境变量

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in your configuration (database connection, API keys, etc.).

Key configurations:
- `SCHOOL_NAME` — Your school name (displayed in UI)
- `SCHOOL_LOGO_URL` — Path to your school logo
- `DB_*` — Database connection
- `AI_PROVIDER` + API keys — For AI smart search

### 4. Initialize Database / 初始化数据库

Execute `server/src/db/init.sql` in PostgreSQL to create the schema.

Optional: Execute `server/src/db/seed.sql` to insert sample data.

### 5. Start Dev Servers / 启动开发服务

```bash
# Backend / 后端
pnpm dev:server

# Kiosk frontend / 展厅前端
pnpm dev:client

# Admin dashboard / 管理后台
pnpm dev:admin
```

### 6. Access / 访问地址

| Service / 服务 | URL |
|:---|:---|
| 🖥️ Kiosk / 展厅前端 | http://localhost:5173 |
| ⚙️ Admin / 管理后台 | http://localhost:5174 |
| 🔌 API / 接口服务 | http://localhost:3000 |

---

## 🐳 Docker Deployment / Docker 部署

```bash
# Configure environment / 配置环境变量
cp server/.env.example server/.env
# Edit .env file... / 编辑 .env 文件...

# Start all services / 启动所有服务
docker compose up -d
```

---

## 📖 Documentation / 文档

- [Deployment Guide / 部署指南](./DEPLOYMENT.md) — Detailed deployment instructions
- [Nginx Config / Nginx 配置](./docs/nginx-xyl.conf) — Reverse proxy configuration reference

---

## 🤝 Contributing / 贡献

Contributions are welcome! Feel free to submit Issues or Pull Requests.

1. Fork this repository / Fork 本仓库
2. Create feature branch / 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. Commit changes / 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. Push to branch / 推送到分支 (`git push origin feature/amazing-feature`)
5. Open a Pull Request / 提交 Pull Request

---

## 📄 License / 许可证

[MIT License](./LICENSE)

---

## ⚠️ Disclaimer / 免责声明

All alumni data included in this project is **fictional and for demonstration purposes only**. Please do not use the sample data for any real-world applications.

本项目中的所有校友数据均为**虚构示例**，仅供演示和开发测试使用。请勿将示例数据用于任何实际用途。
