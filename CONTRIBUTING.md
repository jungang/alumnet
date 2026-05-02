# Contributing to AlumNet

Thank you for your interest in contributing to AlumNet! 🎉

## Ways to Contribute

- 🐛 **Bug Reports** — Submit issues with detailed reproduction steps
- 💡 **Feature Requests** — Share your ideas via GitHub Issues
- 🔧 **Code Contributions** — Submit Pull Requests
- 📖 **Documentation** — Improve docs, fix typos, add translations
- 🌐 **Translations** — Help translate the UI to more languages

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14

### Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/alumnet.git
cd alumnet

# Install dependencies
pnpm install

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your local settings

# Start development
pnpm dev:server   # Backend API
pnpm dev:client   # Kiosk frontend
pnpm dev:admin    # Admin dashboard
```

## Development Workflow

1. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Ensure code quality
   ```bash
   pnpm lint
   pnpm build
   ```
4. Commit with conventional messages
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. Push and create a Pull Request

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic changes)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or tooling changes

## Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- Meaningful variable and function names
- Comments in Chinese or English are both welcome

## Project Structure

```
client/    → Vue 3 + Three.js (Kiosk Frontend)
admin/     → Vue 3 + Element Plus (Admin Dashboard)
server/    → Node.js + Express (Backend API)
```

## Questions?

Feel free to open an issue or start a discussion on GitHub.

---

# 贡献指南

感谢你对 AlumNet 项目的关注！🎉

## 贡献方式

- 🐛 **Bug 报告** — 提交 Issue，附带详细的复现步骤
- 💡 **功能建议** — 通过 GitHub Issues 分享你的想法
- 🔧 **代码贡献** — 提交 Pull Request
- 📖 **文档改进** — 完善文档、修复错字、添加翻译
- 🌐 **多语言** — 帮助翻译 UI 到更多语言

## 开发环境搭建

```bash
git clone https://github.com/YOUR_USERNAME/alumnet.git
cd alumnet
pnpm install
cp server/.env.example server/.env
# 编辑 server/.env 配置本地环境
pnpm dev:server   # 后端 API
pnpm dev:client   # 展厅前端
pnpm dev:admin    # 管理后台
```

## 提交规范

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档修改
- `refactor:` 代码重构

有问题？欢迎在 GitHub 上开 Issue 或 Discussion。
