# 文档站自托管（Next.js / fumadocs + nginx + Let's Encrypt）

用 Docker 把本仓库的文档站自托管起来：`app` 容器跑 `next start`（standalone 产物），
`nginx` 做 HTTPS 反向代理与 TLS 终结，`certbot` 自动签发/续期 Let's Encrypt 证书。
与 Vercel 部署互不影响，可并存。

- 域名：`docs.ailindo.com`
- 对外：`https://docs.ailindo.com/`（nginx:443 → app:3000）
- 证书：Let's Encrypt，90 天有效期，certbot 自动续期（到期前约 30 天）

> **为什么要 nginx**：Next.js `next start` 只提供 HTTP，本身不做 HTTPS。所以由 nginx 终结 TLS、
> 反向代理到 app:3000，并用 certbot 管理证书。

---

## 一、目录结构

```
deploy/
├── docker-compose.yml        # app(Next.js) + nginx + certbot 三个服务
├── Dockerfile                # 构建 Next.js standalone 镜像（构建上下文 = 仓库根）
├── nginx/conf.d/docs.conf    # 站点配置（TLS + ACME + 反向代理到 app:3000）
├── init-letsencrypt.sh       # 首次签发证书的引导脚本（跑一次）
├── .env.example              # 复制为 .env：域名 / 邮箱 / 构建参数
├── .env                      # 本地生成，不入库
├── app.env.example           # 复制为 app.env：应用运行时密钥（AI 搜索 / 反馈）
├── app.env                   # 本地生成，不入库
└── certbot/                  # 证书与 ACME webroot（本地生成，不入库）
    ├── conf/                 # /etc/letsencrypt
    └── www/                  # ACME HTTP-01 challenge 根
```

## 二、前置条件

1. **DNS**：把 `docs.ailindo.com` 的 A 记录解析到本服务器公网 IP。
2. **防火墙 / 安全组**：放行 `80`（ACME 校验 + 跳转）与 `443`（HTTPS）。
3. **软件**：已安装 Docker + Docker Compose v2，以及 `openssl`（引导脚本生成临时证书用）。

## 三、首次部署

```bash
# 1. 把【整个仓库】拷到服务器（Dockerfile 构建上下文是仓库根，不能只拷 deploy/）
cd /opt/new-api-docs/deploy

# 2. 配置域名 / 邮箱（构建参数可选）
cp .env.example .env
vi .env            # 填 LETSENCRYPT_EMAIL；调试期可先设 STAGING=1

# 3. 配置应用运行时密钥（可选，缺失则 AI 搜索 / 反馈降级）
cp app.env.example app.env
vi app.env         # 填 INKEEP_API_KEY / GITHUB_APP_* 等

# 4. 申请证书（脚本先放临时自签证书让 nginx 起来，再换正式证书；--no-deps 不触发 app 构建）
bash init-letsencrypt.sh

# 5. 构建并常驻运行（首次会 build app 镜像，稍慢）
docker compose up -d --build
```

> 调试建议：先 `STAGING=1` 跑通（避免触发 Let's Encrypt 频率限制），
> `curl -I https://docs.ailindo.com/` 能连通后，把 `.env` 改成 `STAGING=0` 再 `bash init-letsencrypt.sh` 重签正式证书。

## 四、应用运行时配置（app.env）

`app` 容器通过 `env_file: app.env` 注入运行时密钥，**全部可选**——缺失时站点仍能正常提供文档，仅对应功能降级：

| 变量 | 用途 |
|---|---|
| `INKEEP_API_KEY` | AI 搜索（Inkeep / 任意 OpenAI 兼容端点） |
| `AI_MODEL` / `AI_BASE_URL` | 可选，AI 搜索的模型与端点 |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` | 文档反馈（写 GitHub Discussions） |

构建期参数（`NEXT_PUBLIC_GA_ID`、changelog 源仓库、GitHub token）在 `.env` 里配置，见 `.env.example`。
改了 `app.env` 后 `docker compose up -d` 重建容器即可生效；改了构建参数需 `docker compose up -d --build`。

## 五、证书与自动续期

- 证书由 **Let's Encrypt** 签发，有效期 **90 天**。
- `certbot` 容器每 12h 跑一次 `certbot renew`，**到期前约 30 天自动续期**（certbot 默认策略，幂等安全，不触发频率限制）。
- 续期后 `nginx` 每 6h 自动 `reload` 加载新证书，无需人工干预。

## 六、运维常用命令

```bash
docker compose ps                           # 状态
docker compose logs -f app                  # 应用日志
docker compose logs -f nginx                # nginx 日志
docker compose exec nginx nginx -t          # 校验 nginx 配置
docker compose exec nginx nginx -s reload   # 改完 docs.conf 手动 reload

# 更新文档站（拉新代码后重建 app 镜像）
docker compose up -d --build app

# 证书：查看 / 演练续期 / 立即续期（entrypoint 被覆盖成续期循环，需 --entrypoint certbot 覆盖回来）
docker compose run --rm --entrypoint certbot certbot certificates
docker compose run --rm --entrypoint certbot certbot renew --dry-run
docker compose run --rm --entrypoint certbot certbot renew && docker compose exec nginx nginx -s reload
```

## 七、验证

```bash
# 80 跳 443
curl -I http://docs.ailindo.com/            # 期望 301 → https

# HTTPS 正常返回文档站
curl -I https://docs.ailindo.com/           # 期望 200，命中 Next.js

# 浏览器打开 https://docs.ailindo.com/：文档站正常、搜索可用
```

## 八、安全说明

- `app` 容器只 `expose 3000` 给同网络的 nginx，**不对宿主 publish**；外部只能经 nginx(443) 访问。
- 证书由 **Let's Encrypt 正规公信 CA** 签发（非自签），certbot 自动续期；浏览器地址栏为正常安全锁。
- `app.env` / `.env` 含密，不入库（已在 `.gitignore`）。
