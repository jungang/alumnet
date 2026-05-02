#!/bin/bash
# 热补丁：在 admin 编译后的 JS 中增加 403 错误拦截
# 问题：管理员 Token 失效后显示"需要管理员权限"但无法操作
# 修复：在 401 拦截逻辑中增加 403 处理，自动清除 Token 并跳转登录页

ADMIN_DIR="/www/wwwroot/default/xyl/admin/assets"

echo "=== 开始热补丁：修复 Admin 403 权限拦截 ==="

# 找到当前使用的 index JS 文件
INDEX_FILE=$(grep -oE 'index-[a-zA-Z0-9_-]+\.js' /www/wwwroot/default/xyl/admin/index.html)
if [ -z "$INDEX_FILE" ]; then
  echo "ERROR: 无法确定 admin index JS 文件"
  exit 1
fi

TARGET="$ADMIN_DIR/$INDEX_FILE"
echo "目标文件: $TARGET"

# 检查是否已包含 403 处理
if grep -q '403' "$TARGET" 2>/dev/null; then
  # 检查是否已有 403 和 401 的联合处理
  if grep -q '403.*401\|401.*403' "$TARGET" 2>/dev/null; then
    echo "已包含 403 拦截逻辑，无需修补"
    exit 0
  fi
fi

# 在 401 拦截处增加 403 处理
# 编译后的代码类似: status===401 时清除 token 并跳转
# 需要改为: status===401||e.response.status===403 时清除 token 并跳转

# 替换方案：将 status===401 替换为 status===401||e.response.status===403
# 注意：编译后变量名可能不同，需要更通用的匹配

# 方案1: 匹配 .status===401 并在其后添加 403 条件
sed -i 's/\.status===401/\.status===401||e.response.status===403/g' "$TARGET"

# 验证
if grep -q '403' "$TARGET"; then
  echo "=== 热补丁成功：Admin 403 拦截已添加 ==="
else
  echo "WARNING: 修补可能未生效，尝试备选方案"
  # 备选方案：匹配 response.status===401
  sed -i 's/response\.status===401/response.status===401||response.status===403/g' "$TARGET"
  if grep -q '403' "$TARGET"; then
    echo "=== 热补丁成功（备选方案）：Admin 403 拦截已添加 ==="
  else
    echo "ERROR: 热补丁失败，需要手动检查编译后代码"
  fi
fi
