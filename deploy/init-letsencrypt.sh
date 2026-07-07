#!/usr/bin/env bash
# 一次性引导脚本：为 $DOMAIN 申请 Let's Encrypt 正式证书。
#
# 解决“nginx 配置引用证书 → 证书还没签 → nginx 起不来”的鸡生蛋问题：
#   1) 在 certbot/conf/live/$DOMAIN 放一张临时自签证书，让 nginx 能先启动；
#   2) 启动 nginx 提供 HTTP-01 应答；
#   3) 删除临时证书，用 certbot --webroot 申请正式证书；
#   4) reload nginx 加载正式证书。
#
# 前置：DNS 已把 $DOMAIN 解析到本机公网 IP，且 80/443 已放行；本机已装 docker / openssl。
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "❌ 未找到 .env，请先：cp .env.example .env 并填写 DOMAIN / LETSENCRYPT_EMAIL" >&2
  exit 1
fi
set -a; . ./.env; set +a

: "${DOMAIN:?请在 .env 设置 DOMAIN}"
: "${LETSENCRYPT_EMAIL:?请在 .env 设置 LETSENCRYPT_EMAIL}"
STAGING="${STAGING:-0}"

# docker compose 命令探测（v2 优先，回退 docker-compose）
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ 未找到 docker compose / docker-compose，请先安装 Docker。" >&2
  exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo "❌ 需要 openssl 生成临时证书（apt/yum install openssl）。" >&2; exit 1; }

CONF_DIR="./certbot/conf"
LIVE_DIR="$CONF_DIR/live/$DOMAIN"
mkdir -p "$CONF_DIR" "./certbot/www"

echo "### 1/4 生成临时自签证书：$DOMAIN"
# 幂等：先清掉上一次 init 残留的 certbot 状态，让本脚本可重复执行。
# 这些 live/archive/renewal 由 root 身份的 certbot 容器写入，宿主的非 root 部署用户删不掉
# （archive/、live/$DOMAIN 均为 root:root 755）；且 live/$DOMAIN/{privkey,fullchain}.pem 是
# 指向 archive/ 的符号链接——非 root 的 openssl 覆盖它们会 "Permission denied" 而失败，
# 正是"第二次跑 init 卡在 1/4"的根因。故用一次性 root 容器（复用 certbot 服务、挂载相同卷）删除。
$DC run --rm --entrypoint sh certbot -c \
  "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

mkdir -p "$LIVE_DIR"
# 不吞 openssl 的 stderr：临时证书生成失败时要能看到真实原因（权限/磁盘等），否则只剩一句 exit 1。
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$LIVE_DIR/privkey.pem" \
  -out    "$LIVE_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN"

echo "### 2/4 启动 nginx（用临时证书；--no-deps 只起 nginx，不触发 app 构建）"
$DC up -d --no-deps nginx

# 等 nginx 真的进入稳态再继续——避免容器进 restart loop 时盲跑 certbot 浪费一次 Let's Encrypt 频次。
# nginx 启动失败最常见原因是宿主 80/443 被另一个进程占用（系统包装的 nginx/apache）。
# 用宿主 curl 探 127.0.0.1:80（compose 已 publish 80），任何 HTTP 响应（含 4xx）都说明 nginx 在线；
# 不在容器里查端口——nginx:stable 是 slim 镜像，没装 ss / netstat。
echo "    等待 nginx 健康 (最多 15s)..."
command -v curl >/dev/null 2>&1 || { echo "❌ 需要 curl（用于健康检查），请先安装：yum/apt install -y curl" >&2; exit 1; }
ok=0
for i in $(seq 1 15); do
  sleep 1
  code=$(curl --connect-timeout 2 -sS -o /dev/null -w '%{http_code}' http://127.0.0.1/ 2>/dev/null || echo 000)
  case "$code" in
    2*|3*|4*) ok=1; break ;;
  esac
done
if [ "$ok" != "1" ]; then
  echo "❌ nginx 未能在 15s 内对 http://127.0.0.1/ 作出 HTTP 响应。常见原因：" >&2
  echo "   - 宿主 80/443 被另一个进程占用（系统的 nginx/apache）；查: ss -tlnp | grep -E ':80 |:443 '" >&2
  echo "   - 临时证书生成失败；查: ls -la $LIVE_DIR" >&2
  echo "" >&2
  echo "===== docker compose logs nginx (最近 60 行) =====" >&2
  $DC logs --tail=60 nginx >&2
  echo "===== docker compose ps =====" >&2
  $DC ps >&2
  exit 1
fi
echo "    ✅ nginx 运行正常"

echo "### 3/4 删除临时证书并申请正式证书（STAGING=$STAGING）"
rm -rf "$CONF_DIR/live/$DOMAIN" "$CONF_DIR/archive/$DOMAIN" "$CONF_DIR/renewal/$DOMAIN.conf"

staging_arg=""
[ "$STAGING" != "0" ] && staging_arg="--staging"

# compose 中把 certbot 的 entrypoint 覆盖成了"死循环每 12h 续期一次"以便常驻；
# 这里申请新证书必须用 --entrypoint certbot 覆盖回原始入口，否则 `certonly ...` 会被
# 当作死循环 sh -c 的 args 忽略掉、表现为 "No renewals were attempted." 然后卡住。
$DC run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  $staging_arg \
  -d "$DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --rsa-key-size 4096 \
  --agree-tos --no-eff-email --non-interactive \
  --force-renewal

echo "### 4/4 reload nginx 加载正式证书"
$DC exec nginx nginx -s reload

echo
echo "✅ 完成。打开 https://$DOMAIN/ 验证（STAGING=1 时浏览器会提示证书不受信任，属正常，调通后把 .env 的 STAGING 改 0 重跑本脚本即可）。"
echo "   随后 docker compose up -d 构建并常驻 app + nginx + certbot；certbot 会自动续期（到期前约 30 天）。"
