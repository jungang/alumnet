# 多阶段构建 - 校友查询系统

# 阶段1: 构建前端
FROM node:26-alpine AS frontend-builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY admin/package.json ./admin/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY client/ ./client/
COPY admin/ ./admin/
COPY tsconfig.base.json ./

# 构建前端
RUN pnpm build:client && pnpm build:admin

# 阶段2: 构建后端
FROM node:26-alpine AS backend-builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile --filter server

COPY server/ ./server/
COPY tsconfig.base.json ./

RUN pnpm build:server

# 阶段3: 生产镜像
FROM node:26-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# 复制 package 文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --filter server --prod

# 复制构建产物
COPY --from=frontend-builder /app/client/dist ./client/dist
COPY --from=frontend-builder /app/admin/dist ./admin/dist
COPY --from=backend-builder /app/server/dist ./server/dist

# 创建上传目录
RUN mkdir -p /app/server/uploads/photos /app/server/uploads/images /app/server/uploads/documents /app/server/uploads/vintage /app/server/uploads/temp

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server

CMD ["node", "dist/app.js"]
