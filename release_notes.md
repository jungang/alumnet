# AlumNet v1.0.0 — Initial Public Release

> **AI-Powered School History Exhibition & Alumni Management System**

We're excited to announce the first public release of AlumNet — the first open-source AI-powered alumni exhibition system designed for school history museums.

---

## ✨ Highlights

### 🖥️ Touch-Screen Exhibition Kiosk

An immersive frontend built with **Vue 3 + Three.js**, featuring:

- **Alumni Galaxy** — 3D interactive star map visualization of alumni
- **Time Corridor** — Chronological photo gallery organized by graduation year
- **Vintage Museum** — Digital archive of historical items
- **AI Smart Search** — Natural language Q&A powered by RAG (Qdrant + pgvector)
- **Interactive Message Board** — Alumni greetings and memories wall
- Sci-fi standby screen with real-time clock and wake-on-touch

### 🤖 AI-Powered Smart Search

Natural language query powered by **RAG architecture**:

- Ask questions like "哪些校友在医疗领域工作？" and get intelligent answers
- Multi-provider support: GLM-4, DeepSeek, or any OpenAI-compatible API
- Powered by **Qdrant** vector database + **pgvector** embeddings

### ⚙️ Admin Dashboard

Complete management backend with **Element Plus**:

- Alumni CRUD with batch import/export (Excel supported)
- Graduation photo management with face tagging
- Content moderation for messages & comments
- System dashboard with usage analytics
- One-click database backup & restore

### 🏗️ Production-Ready Infrastructure

- **Docker Compose** — One command to production (`docker compose up -d`)
- **PM2** — Process management with auto-restart
- **Nginx** — Reverse proxy with SPA routing
- **PostgreSQL + pgvector** — Reliable data storage with vector support

---

## 🛠️ Tech Stack

| Layer           | Technology                                   |
| :-------------- | :------------------------------------------- |
| Kiosk Frontend  | Vue 3 · TypeScript · Three.js · Tailwind CSS |
| Admin Dashboard | Vue 3 · TypeScript · Element Plus            |
| Backend API     | Node.js · Express · TypeScript               |
| Database        | PostgreSQL · pgvector                        |
| Vector Search   | Qdrant                                       |
| AI Engine       | GLM-4 / DeepSeek API                         |
| Deployment      | Docker · PM2 · Nginx                         |

---

## 📊 What's Included

- 19 admin views for complete alumni management
- RAG-powered hybrid search with keyword fallback
- AI summary service for auto-generating alumni profiles
- Comprehensive test suite with Vitest
- CI/CD pipeline with GitHub Actions (lint → test → build)
- ESLint 9 + Prettier 3 + Husky pre-commit hooks
- Commitlint with conventional commits enforcement

---

## 🚀 Quick Start

```bash
git clone https://github.com/jungang/alumnet.git
cd alumnet
pnpm install
cp server/.env.example server/.env
# Configure your settings, then:
pnpm dev:server   # Backend API → http://localhost:3000
pnpm dev:client   # Kiosk frontend → http://localhost:5173
pnpm dev:admin    # Admin dashboard → http://localhost:5174
```

Or with Docker:

```bash
cp server/.env.example server/.env
# Edit .env with production values
docker compose up -d
```

---

## ⚠️ Disclaimer

All alumni data included in this project is **fictional** and for **demonstration purposes only**. Do not use the sample data in production environments.

---

## 🤝 Get Involved

- ⭐ Star the repo to help others discover it
- 🐛 [Report bugs](https://github.com/jungang/alumnet/issues/new?template=bug_report.md) or [suggest features](https://github.com/jungang/alumnet/issues/new?template=feature_request.md)
- 💬 Join the [Discussions](https://github.com/jungang/alumnet/discussions)
- 🔧 See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute

**Made with ❤️ for school history museums everywhere**
