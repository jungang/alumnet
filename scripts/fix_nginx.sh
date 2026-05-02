#!/bin/bash
# 修复 Nginx 配置：添加 /alumni-photos/ 映射，修复 /uploads/ 缓存配置

NGINX_CONF="/www/server/panel/vhost/nginx/YOUR_SERVER_IP.conf"

# 1. 修复 /uploads/ 缓存配置：移除 immutable，缩短 expires
sed -i 's/expires 30d;/expires 1h;/' "$NGINX_CONF"
sed -i 's/add_header Cache-Control "public, immutable";/add_header Cache-Control "public, no-cache";/' "$NGINX_CONF"

# 2. 在 /uploads/ location 块之前添加 /alumni-photos/ 映射
if ! grep -q 'alumni-photos' "$NGINX_CONF"; then
  sed -i '/# 校友查询系统 - 上传文件访问/i\
# 校友查询系统 - 校友照片访问（旧路径兼容）\
location ^~ /alumni-photos/ {\
    alias /www/wwwroot/default/xyl/client/alumni-photos/;\
    expires 1h;\
    add_header Cache-Control "public, no-cache";\
    access_log off;\
}\
' "$NGINX_CONF"
  echo "Added /alumni-photos/ location block"
else
  echo "/alumni-photos/ location already exists"
fi

# 3. 验证并重载 Nginx
nginx -t && nginx -s reload && echo "Nginx config updated and reloaded successfully" || echo "Nginx config test failed"
