# syntax=docker/dockerfile:1
# 文档站（Next.js / fumadocs）自托管镜像。
# 构建上下文是【仓库根】（见 docker-compose.yml 的 build.context: ..）。
#
# 两阶段：
#   builder  用 bun 安装依赖并 next build（standalone 产物）
#   runner   仅拷贝 standalone 产物、用 node 运行，镜像小且非 root

# ---------- builder ----------
FROM oven/bun:1 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 先拷全部源码再装依赖：postinstall(fumadocs-mdx) 需要 source.config.ts + content/
# 才能生成 .source/，所以不能只拷 package.json 就 install。
COPY . .
RUN bun install --frozen-lockfile

# 构建期参数：
#   NEXT_PUBLIC_GA_ID  Google Analytics（NEXT_PUBLIC_* 会被内联进前端产物，必须构建期给）
#   SOURCE_REPO        prebuild 生成 changelog 抓取的源仓库
#   GITHUB_TOKEN       可选，避免 prebuild 抓 changelog 时被 GitHub 限流
ARG NEXT_PUBLIC_GA_ID=""
ARG SOURCE_REPO="ailindo"
ARG GITHUB_TOKEN=""
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID} \
    SOURCE_REPO=${SOURCE_REPO} \
    GITHUB_TOKEN=${GITHUB_TOKEN}

# prebuild(生成 changelog) → next build。prebuild 失败会被脚本 catch，不阻断构建。
RUN bun scripts/prebuild.ts && bun run next build

# ---------- runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 非 root 运行
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# standalone 只需三块：server.js + 追踪到的依赖(standalone)、静态资源(static)、public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# standalone 产物的入口；监听 $HOSTNAME:$PORT
CMD ["node", "server.js"]
