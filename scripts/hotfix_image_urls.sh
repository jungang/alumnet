#!/bin/bash
# 热补丁：移除客户端编译后 JS 文件中图片 URL 的 /xyl 前缀
# 问题：Vue 编译后模板中 :src="/xyl${...}" 导致 Nginx 无法匹配 /uploads/ 路径
# 修复：将 /xyl${ 替换为 ${

CLIENT_DIR="/www/wwwroot/default/xyl/client/assets"

echo "=== 开始热补丁：修复图片 URL 前缀 ==="

# 统计需要修补的文件
FILES=$(grep -l '/xyl${' "$CLIENT_DIR"/*.js 2>/dev/null)
if [ -z "$FILES" ]; then
  echo "无需修补，未找到包含 /xyl\${ 的文件"
  exit 0
fi

echo "需要修补的文件："
echo "$FILES"

# 执行替换
for f in $FILES; do
  sed -i 's|/xyl${|${|g' "$f"
  if [ $? -eq 0 ]; then
    echo "  [OK] $f"
  else
    echo "  [FAIL] $f"
  fi
done

# 验证
REMAINING=$(grep -l '/xyl${' "$CLIENT_DIR"/*.js 2>/dev/null)
if [ -z "$REMAINING" ]; then
  echo "=== 热补丁完成：所有文件已修复 ==="
else
  echo "=== 警告：以下文件仍有残留 ==="
  echo "$REMAINING"
fi
