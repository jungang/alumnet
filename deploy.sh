#!/bin/bash

# ============================================
# 部署脚本 - 校友查询系统
# ============================================
# 使用方法: ./deploy.sh [full|client|admin|server|init]
# 参数说明:
#   init   - 首次部署（创建目录、启动Docker）
#   full   - 完整更新（默认）
#   client - 仅更新触控展示端
#   admin  - 仅更新后台管理端
#   server - 仅更新后端服务
# ============================================

set -e

SERVER="user@YOUR_SERVER_IP"
DEPLOY_PATH="/www/wwwroot/default/xyl"
MODE=${1:-full}

echo "=========================================="
echo "  校友查询系统部署脚本"
echo "  部署模式: $MODE"
echo "  目标路径: $DEPLOY_PATH"
echo "=========================================="

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}>>> $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}>>> $1${NC}"
}

# 首次部署初始化
deploy_init() {
    log_info "首次部署初始化..."
    
    # 本地构建
    log_info "构建所有项目..."
    pnpm install
    pnpm build:client
    pnpm build:admin
    pnpm build:server
    
    # 创建服务器目录结构
    log_info "创建服务器目录..."
    ssh ${SERVER} << 'EOF'
mkdir -p /www/wwwroot/default/xyl/{client,admin,server/dist,server/uploads,logs}
EOF
    
    # 上传所有文件
    log_info "上传文件到服务器..."
    rsync -avz --progress client/dist/ ${SERVER}:${DEPLOY_PATH}/client/
    rsync -avz --progress admin/dist/ ${SERVER}:${DEPLOY_PATH}/admin/
    rsync -avz --progress server/dist/ ${SERVER}:${DEPLOY_PATH}/server/dist/
    rsync -avz --progress server/package.json ${SERVER}:${DEPLOY_PATH}/server/
    # NOTE: Upload .env.example and have user create their own .env.production
    rsync -avz --progress server/.env.example ${SERVER}:${DEPLOY_PATH}/server/
    rsync -avz --progress docker-compose.yml ${SERVER}:${DEPLOY_PATH}/
    
    # 启动Docker容器
    log_info "启动Docker容器..."
    ssh ${SERVER} << EOF
cd ${DEPLOY_PATH}
docker compose up -d
docker compose logs -f --tail=50
EOF
    
    log_warn "请手动配置宝塔Nginx，添加 docs/nginx-xyl.conf 中的配置"
}

# 完整更新
deploy_full() {
    log_info "开始完整更新..."
    
    pnpm install
    pnpm build:client
    pnpm build:admin
    pnpm build:server
    
    log_info "同步文件到服务器..."
    rsync -avz --delete --progress client/dist/ ${SERVER}:${DEPLOY_PATH}/client/
    rsync -avz --delete --progress admin/dist/ ${SERVER}:${DEPLOY_PATH}/admin/
    rsync -avz --delete --progress server/dist/ ${SERVER}:${DEPLOY_PATH}/server/dist/
    rsync -avz --progress server/package.json ${SERVER}:${DEPLOY_PATH}/server/
    
    log_info "重启后端服务..."
    ssh ${SERVER} "cd ${DEPLOY_PATH} && docker compose restart xyl-server"
    
    log_info "查看服务状态..."
    ssh ${SERVER} "docker ps | grep xyl"
}

# 仅更新客户端
deploy_client() {
    log_info "更新触控展示端..."
    
    pnpm build:client
    rsync -avz --delete --progress client/dist/ ${SERVER}:${DEPLOY_PATH}/client/
    
    log_info "客户端更新完成（无需重启服务）"
}

# 仅更新管理端
deploy_admin() {
    log_info "更新后台管理端..."
    
    pnpm build:admin
    rsync -avz --delete --progress admin/dist/ ${SERVER}:${DEPLOY_PATH}/admin/
    
    log_info "管理端更新完成（无需重启服务）"
}

# 仅更新服务端
deploy_server() {
    log_info "更新后端服务..."
    
    pnpm build:server
    rsync -avz --delete --progress server/dist/ ${SERVER}:${DEPLOY_PATH}/server/dist/
    rsync -avz --progress server/package.json ${SERVER}:${DEPLOY_PATH}/server/
    
    log_info "重启后端服务..."
    ssh ${SERVER} "cd ${DEPLOY_PATH} && docker compose restart xyl-server"
    
    log_info "查看日志..."
    ssh ${SERVER} "docker logs xyl-server --tail=20"
}

# 根据模式执行
case $MODE in
    init)
        deploy_init
        ;;
    full)
        deploy_full
        ;;
    client)
        deploy_client
        ;;
    admin)
        deploy_admin
        ;;
    server)
        deploy_server
        ;;
    *)
        echo "未知模式: $MODE"
        echo "使用方法: ./deploy.sh [init|full|client|admin|server]"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo "访问地址:"
echo "  触控展示端: http://YOUR_SERVER_IP/xyl"
echo "  后台管理:   http://YOUR_SERVER_IP/xyl/admin"
echo "  API健康检查: http://YOUR_SERVER_IP/xyl/api/health"
echo "=========================================="
